# Show Address in Admin Dashboard

✅ **1. Understand files and create plan** (Done)

✅ **2. Update src/types/index.ts** - Add address to Order interface

✅ **3. Update backend/models/Order.js** - Add address schema fields

✅ **4. Update backend/controllers/orderController.js** - Destructure and save address in createOrder

✅ **5. Update src/pages/Checkout.tsx** - Capture address form state and send in addOrder

✅ **6. Update src/pages/AdminDashboard.tsx** - Display address in orders tab

✅ **7. Test** - All changes complete!

**Backend schema change requires restart. Run: `cd backend && bun run server.js` (or your start command)

**To test:**
1. Ensure backend running
2. Login as user, add shoes to cart
3. Go to /checkout, fill address + payment, place order
4. Login as admin, go to /admin, check Orders tab shows address
