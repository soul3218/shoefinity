const express = require("express");
const { validateCoupon } = require("../controllers/couponController");

const router = express.Router();

router.get("/validate", validateCoupon);

module.exports = router;
