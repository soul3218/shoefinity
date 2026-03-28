const Shoe = require("../models/Shoe");
const User = require("../models/User");

function normalizeItemShoeId(item) {
  const shoe = item?.shoe;
  if (!shoe) return undefined;
  if (typeof shoe === "string") return shoe;
  if (typeof shoe === "object" && shoe._id) return shoe._id;
  return undefined;
}

function sanitizeCartItems(items) {
  if (!Array.isArray(items)) return [];

  const aggregated = new Map();
  for (const item of items) {
    const shoe = normalizeItemShoeId(item);
    const quantity = Number(item?.quantity);
    const size = Number(item?.size);

    if (!shoe || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(size) || size <= 0) continue;

    const key = `${shoe}:${size}`;
    const existing = aggregated.get(key);
    aggregated.set(key, {
      shoe,
      size,
      quantity: existing ? existing.quantity + quantity : quantity,
    });
  }

  return Array.from(aggregated.values());
}

async function populateUser(userId) {
  return User.findById(userId)
    .select("-password")
    .populate("cart.shoe")
    .populate("wishlist");
}

const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

const getMyCart = async (req, res) => {
  const user = await populateUser(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.cart ?? []);
};

const replaceMyCart = async (req, res) => {
  const nextItems = sanitizeCartItems(req.body?.items);
  const shoeIds = Array.from(new Set(nextItems.map((item) => String(item.shoe))));
  const validShoes = await Shoe.find({ _id: { $in: shoeIds } }).select("_id");
  const validSet = new Set(validShoes.map((shoe) => String(shoe._id)));

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.cart = nextItems.filter((item) => validSet.has(String(item.shoe)));
  await user.save();

  const populated = await populateUser(req.user._id);
  res.json(populated?.cart ?? []);
};

const getMyWishlist = async (req, res) => {
  const user = await populateUser(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.wishlist ?? []);
};

const toggleWishlistItem = async (req, res) => {
  const shoeId = String(req.params.shoeId || "").trim();
  if (!shoeId) return res.status(400).json({ message: "Shoe id required" });

  const shoe = await Shoe.findById(shoeId).select("_id");
  if (!shoe) return res.status(404).json({ message: "Shoe not found" });

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const exists = user.wishlist.some((id) => String(id) === String(shoe._id));
  user.wishlist = exists
    ? user.wishlist.filter((id) => String(id) !== String(shoe._id))
    : [...user.wishlist, shoe._id];

  await user.save();

  const populated = await populateUser(req.user._id);
  res.json(populated?.wishlist ?? []);
};

module.exports = { getMe, getMyCart, replaceMyCart, getMyWishlist, toggleWishlistItem };
