const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    cart: [
      {
        shoe: { type: mongoose.Schema.Types.ObjectId, ref: "Shoe", required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
        size: { type: Number, required: true },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shoe" }],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
