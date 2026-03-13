import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { verifyMailer, sendMail } from "./utils/mailer.js";
import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// GET /test-email?to=you@example.com  — sends a test email and confirms SMTP works
app.get("/test-email", async (req, res) => {
  const to = req.query.to;
  if (!to) return res.status(400).json({ success: false, message: "Provide ?to=email" });
  try {
    await verifyMailer();
    const info = await sendMail({
      to,
      subject: "CanStar Backend — SMTP Test",
      html: "<p>If you receive this, SMTP is working correctly.</p>",
    });
    return res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  verifyMailer().catch((err) => console.error("[MAIL] SMTP connection FAILED:", err.message));
});