const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const seedAdmin = require("./config/seedAdmin");
const seedShoes = require("./config/seedShoes");
const seedCoupons = require("./config/seedCoupons");

const app = express();
let dbReady = false;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, dbReady }));

app.use("/api", (req, res, next) => {
  if (dbReady) return next();
  if (req.path === "/health") return next();
  return res.status(503).json({ message: "Database not connected" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/shoes", require("./routes/shoeRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

const port = process.env.PORT || 5000;
const exitOnDbFail = String(process.env.EXIT_ON_DB_FAIL ?? "true").toLowerCase() !== "false";

connectDB()
  .then(async () => {
    dbReady = true;
    // eslint-disable-next-line no-console
    console.log("MongoDB connected");
    await seedAdmin();
    await seedShoes();
    await seedCoupons();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection failed:", e);
    if (exitOnDbFail) process.exit(1);

    // eslint-disable-next-line no-console
    console.warn("Starting server without DB (set EXIT_ON_DB_FAIL=true to exit on failure).");
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${port}`);
    });
  });
