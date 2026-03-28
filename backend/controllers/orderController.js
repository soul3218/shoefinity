const Order = require("../models/Order");
const Shoe = require("../models/Shoe");
const User = require("../models/User");
const { getCouponPreview, normalizeCouponCode } = require("./couponController");

function normalizeItemShoeId(item) {
  const shoe = item?.shoe;
  if (!shoe) return undefined;
  if (typeof shoe === "string") return shoe;
  if (typeof shoe === "object" && shoe._id) return shoe._id;
  return undefined;
}

async function buildOrderItems(items) {
  const normalizedItems = items
    .map((i) => ({
      shoe: normalizeItemShoeId(i),
      quantity: Number(i?.quantity),
      size: Number(i?.size),
    }))
    .filter((i) => i.shoe && Number.isFinite(i.quantity) && i.quantity > 0 && Number.isFinite(i.size) && i.size > 0);

  const shoeIds = Array.from(new Set(normalizedItems.map((item) => String(item.shoe))));
  const shoes = await Shoe.find({ _id: { $in: shoeIds } }).select("_id name price");
  const shoeMap = new Map(shoes.map((shoe) => [String(shoe._id), shoe]));

  return normalizedItems
    .map((item) => {
      const shoe = shoeMap.get(String(item.shoe));
      if (!shoe) return null;
      return {
        shoe: shoe._id,
        shoeName: shoe.name,
        unitPrice: shoe.price,
        quantity: item.quantity,
        size: item.size,
      };
    })
    .filter(Boolean);
}

function sanitizeAddress(address) {
  if (!address || typeof address !== "object") return undefined;
  const fields = ["street", "city", "state", "pincode", "phone"];
  const normalized = fields.reduce((acc, key) => {
    const value = String(address[key] ?? "").trim();
    if (value) acc[key] = value;
    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

const createOrder = async (req, res) => {
  const { items, paymentMethod, status, address, couponCode } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items required" });
  if (!paymentMethod) return res.status(400).json({ message: "Payment method required" });

  const normalizedItems = await buildOrderItems(items);
  if (normalizedItems.length === 0) return res.status(400).json({ message: "Invalid items" });

  const subtotal = Number(
    normalizedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  );
  const couponPreview = await getCouponPreview(couponCode, subtotal);
  if (couponCode && !couponPreview.valid) {
    return res.status(400).json({ message: couponPreview.message || "Invalid coupon" });
  }

  const discount = couponPreview.valid ? couponPreview.discount : 0;
  const total = Number((subtotal - discount).toFixed(2));

  const order = await Order.create({
    userId: req.user._id,
    userName: req.user.name,
    items: normalizedItems,
    subtotal,
    discount,
    couponCode: couponPreview.valid ? normalizeCouponCode(couponCode) : undefined,
    total,
    paymentMethod,
    status: status || "pending",
    address: sanitizeAddress(address),
  });

  await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });

  const populated = await Order.findById(order._id).populate("items.shoe");
  res.status(201).json(populated);
};

const getAllOrders = async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate("items.shoe");
  res.json(orders);
};

const getMyOrders = async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).populate("items.shoe");
  res.json(orders);
};

const getOrderAnalytics = async (_req, res) => {
  const [orders, shoes] = await Promise.all([
    Order.find().sort({ createdAt: 1 }).populate("items.shoe"),
    Shoe.find().select("_id name"),
  ]);

  const now = new Date();
  const revenueLookup = new Map();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(now.getDate() - offset);
    revenueLookup.set(day.toISOString().slice(0, 10), {
      date: day.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      revenue: 0,
      orders: 0,
    });
  }

  const statusCounts = { pending: 0, confirmed: 0, shipped: 0, delivered: 0 };
  const paymentCounts = { online: 0, card: 0, cod: 0 };
  const customerIds = new Set();
  const productStats = new Map();

  for (const order of orders) {
    customerIds.add(String(order.userId));
    if (order.status in statusCounts) statusCounts[order.status] += 1;
    if (order.paymentMethod in paymentCounts) paymentCounts[order.paymentMethod] += 1;

    const orderDateKey = new Date(order.createdAt).toISOString().slice(0, 10);
    const bucket = revenueLookup.get(orderDateKey);
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }

    for (const item of order.items) {
      const key = String(item.shoe?._id || item.shoe || item.shoeName);
      const unitPrice = item.unitPrice ?? item.shoe?.price ?? 0;
      const existing = productStats.get(key) || {
        shoeId: item.shoe?._id ? String(item.shoe._id) : undefined,
        name: item.shoe?.name || item.shoeName,
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += unitPrice * item.quantity;
      productStats.set(key, existing);
    }
  }

  const totalRevenue = Number(orders.reduce((sum, order) => sum + order.total, 0).toFixed(2));
  const totalDiscount = Number(orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed(2));
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
  const totalUnitsSold = Array.from(productStats.values()).reduce((sum, item) => sum + item.unitsSold, 0);

  res.json({
    summary: {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalDiscount,
      totalCustomers: customerIds.size,
      totalProducts: shoes.length,
      totalUnitsSold,
      pendingOrders: statusCounts.pending,
      deliveredOrders: statusCounts.delivered,
    },
    revenueSeries: Array.from(revenueLookup.values()),
    statusSeries: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    paymentSeries: Object.entries(paymentCounts).map(([method, count]) => ({ method, count })),
    topProducts: Array.from(productStats.values())
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 5),
    recentOrders: orders
      .slice(-5)
      .reverse()
      .map((order) => ({
        _id: order._id,
        userName: order.userName,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      })),
  });
};

module.exports = { createOrder, getAllOrders, getMyOrders, getOrderAnalytics };

