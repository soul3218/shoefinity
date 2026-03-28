const express = require("express");
const { createOrder, getAllOrders, getMyOrders, getOrderAnalytics } = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/analytics", protect, adminOnly, getOrderAnalytics);
router.get("/", protect, adminOnly, getAllOrders);
router.get("/mine", protect, getMyOrders);

module.exports = router;
