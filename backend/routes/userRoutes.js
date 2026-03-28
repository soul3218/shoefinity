const express = require("express");
const { getMyCart, replaceMyCart, getMyWishlist, toggleWishlistItem } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/me/cart", getMyCart);
router.put("/me/cart", replaceMyCart);
router.get("/me/wishlist", getMyWishlist);
router.post("/me/wishlist/:shoeId/toggle", toggleWishlistItem);

module.exports = router;
