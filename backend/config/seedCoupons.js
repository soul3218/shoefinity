const Coupon = require("../models/Coupon");

async function seedCoupons() {
  const seedFlag = process.env.SEED_COUPONS;
  const enabled =
    seedFlag == null
      ? String(process.env.NODE_ENV || "").toLowerCase() !== "production"
      : String(seedFlag).toLowerCase() === "true";
  if (!enabled) return;

  const defaults = [
    {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      minSubtotal: 2000,
      description: "10% off orders above Rs. 2,000",
    },
    {
      code: "RUN500",
      type: "fixed",
      value: 500,
      minSubtotal: 5000,
      description: "Flat Rs. 500 off orders above Rs. 5,000",
    },
    {
      code: "FREESTEP",
      type: "percentage",
      value: 15,
      minSubtotal: 8000,
      maxDiscount: 1500,
      description: "15% off, capped at Rs. 1,500",
    },
  ];

  await Promise.all(
    defaults.map((coupon) =>
      Coupon.findOneAndUpdate({ code: coupon.code }, coupon, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
    )
  );
}

module.exports = seedCoupons;
