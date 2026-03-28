const Order = require("../models/Order");

function normalizeItemShoeId(item) {
  const shoe = item?.shoe;
  if (!shoe) return undefined;
  if (typeof shoe === "string") return shoe;
  if (typeof shoe === "object" && shoe._id) return shoe._id;
  return undefined;
}

const createOrder = async (req, res) => {
  const { items, total, paymentMethod, status, address } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items required" });
  if (total == null) return res.status(400).json({ message: "Total required" });
  if (!paymentMethod) return res.status(400).json({ message: "Payment method required" });

  const normalizedItems = items
    .map((i) => ({
      shoe: normalizeItemShoeId(i),
      quantity: i?.quantity,
      size: i?.size,
    }))
    .filter((i) => i.shoe && i.quantity && i.size);

  if (normalizedItems.length === 0) return res.status(400).json({ message: "Invalid items" });

  const order = await Order.create({
    userId: req.user._id,
    userName: req.user.name,
    items: normalizedItems,
    total,
    paymentMethod,
    status: status || "pending",
    address,
  });

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

module.exports = { createOrder, getAllOrders, getMyOrders };

