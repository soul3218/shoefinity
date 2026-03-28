const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

const register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) return res.status(409).json({ message: "Email already in use" });

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);
  res.status(201).json({
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Missing fields" });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await user.matchPassword(password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken(user._id);
  res.json({
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

module.exports = { register, login };
