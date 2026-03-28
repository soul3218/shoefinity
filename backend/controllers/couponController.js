const Coupon = require("../models/Coupon");

function normalizeCouponCode(code) {
  return String(code || "").trim().toUpperCase();
}

function calculateDiscount(subtotal, coupon) {
  if (!coupon || subtotal <= 0) return 0;

  const rawDiscount = coupon.type === "percentage" ? (subtotal * coupon.value) / 100 : coupon.value;
  const cappedDiscount = coupon.maxDiscount != null ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
  return Number(Math.min(cappedDiscount, subtotal).toFixed(2));
}

async function getCouponPreview(code, subtotal) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return {
      valid: false,
      message: "Enter a promo code.",
      code: "",
      discount: 0,
      subtotal,
      total: subtotal,
    };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode, active: true });
  if (!coupon) {
    return {
      valid: false,
      message: "Coupon not found or inactive.",
      code: normalizedCode,
      discount: 0,
      subtotal,
      total: subtotal,
    };
  }

  if (subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      message: `Minimum order value for ${normalizedCode} is Rs. ${coupon.minSubtotal}.`,
      code: normalizedCode,
      discount: 0,
      subtotal,
      total: subtotal,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
      },
    };
  }

  const discount = calculateDiscount(subtotal, coupon);
  return {
    valid: true,
    message: "Coupon applied.",
    code: normalizedCode,
    discount,
    subtotal,
    total: Number((subtotal - discount).toFixed(2)),
    coupon: {
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minSubtotal: coupon.minSubtotal,
      maxDiscount: coupon.maxDiscount,
    },
  };
}

const validateCoupon = async (req, res) => {
  const subtotal = Number(req.query.subtotal ?? 0);
  const preview = await getCouponPreview(req.query.code, Number.isFinite(subtotal) ? subtotal : 0);
  res.json(preview);
};

module.exports = { calculateDiscount, getCouponPreview, normalizeCouponCode, validateCoupon };
