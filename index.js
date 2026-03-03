import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/auth", authRoutes);
app.use("/account", accountRoutes);
app.use("/users", usersRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/quote", quoteRoutes);
app.use("/customer", customerRoutes);
app.use("/products", productsRoutes);
app.use("/payment", paymentRoutes);

// app.listen(process.env.PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
// });

// Default route (important for testing)
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});