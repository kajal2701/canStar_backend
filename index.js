/**
 * @file index.js
 * @description Express application entry point.
 *
 * Base URL : http://localhost:3000
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * AUTH  —  /auth
 * ══════════════════════════════════════════════════════════════════════════════
 *  POST  /auth/login                          User login
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * ACCOUNT  —  /account
 * ══════════════════════════════════════════════════════════════════════════════
 *  POST  /account/login_process               Authenticate and return token
 *  GET   /account/profile/:user_id            Get profile by user ID
 *  POST  /account/edit_profile_process        Update profile
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * USERS  —  /users
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /users/manage_user                   List all users
 *  POST  /users/add_user_process              Create a new user
 *  GET   /users/edit_user/:user_id            Get user for editing
 *  POST  /users/edit_user_process             Update user
 *  POST  /users/delete_user                   Delete user
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DASHBOARD  —  /dashboard
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /dashboard/                          Get dashboard summary stats
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CUSTOMERS  —  /customer
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /customer/manage_customer            List all customers
 *  POST  /customer/add_customer_process       Create a new customer
 *  GET   /customer/edit_customer/:customer_id Get customer for editing
 *  POST  /customer/update_customer_process    Update customer
 *  POST  /customer/delete_customer            Delete customer
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * PRODUCTS  —  /products
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /products/manage_products            List all products
 *  POST  /products/add_product_process        Create a new product
 *  GET   /products/edit_product/:product_id   Get product for editing
 *  POST  /products/edit_product_process       Update product
 *  POST  /products/delete_product             Delete product
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * PAYMENT  —  /payment
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /payment/manage_invoice              List all invoices
 *  POST  /payment/processPayment              Submit part/full payment (multipart: etransfer_screenshot)
 *  POST  /payment/processPaymentfinal         Submit final payment (multipart: etransfer_screenshot)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUOTES  —  /quote
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /quote/manage_quote                  List all quotes          (?user_id&role)
 *  GET   /quote/get_product_data              List active products
 *  GET   /quote/get_colors                    List all colors
 *  GET   /quote/get_provinces                 List all provinces / tax rates
 *  POST  /quote/add_quote_process             Create a new quote       (multipart)
 *  GET   /quote/view_quote/:quote_id          View quote details
 *  GET   /quote/view_quote_payment/:quote_id  View quote payment details
 *  GET   /quote/edit_quote/:quote_id          Get quote for editing
 *  POST  /quote/edit_quote_process            Update quote             (multipart)
 *  POST  /quote/send_for_approval             Set quote status → pending approval
 *  POST  /quote/send_for_approve              Set quote status → approved, email customer
 *  POST  /quote/delete_quote                  Soft-delete quote (status = 5)
 *  POST  /quote/set_payment_option            Set payment type & amounts
 *  POST  /quote/add_extra_work_process        Add extra work to quote
 *  POST  /quote/send_final_quote              Send final invoice email
 *  POST  /quote/resend_quote                  Re-send customer quote email
 *  POST  /quote/update_quote                  Send updated quote email
 *  POST  /quote/payment_receive               Mark payment as received
 *  POST  /quote/schedule_installation         Set installation date & email customer
 *  GET   /quote/installs                      List upcoming & non-scheduled installs
 *  GET   /quote/installs2                     List upcoming / past-pending / non-scheduled installs
 *  POST  /quote/saveQuoteSanction             Save sanction reason (reason 4 requires notes)
 *  POST  /quote/saveFollowupDate              Save follow-up date
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * INVENTORY  —  /inventory
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /inventory/tracks                    List all tracks
 *  POST  /inventory/tracks/add                Add track
 *  POST  /inventory/tracks/edit               Edit track
 *  POST  /inventory/tracks/delete             Delete track
 *
 *  GET   /inventory/screws                    List all screws
 *  POST  /inventory/screws/add                Add screw
 *  POST  /inventory/screws/edit               Edit screw
 *  POST  /inventory/screws/delete             Delete screw
 *
 *  GET   /inventory/powercords                List all power cords
 *  POST  /inventory/powercords/add            Add power cord
 *  POST  /inventory/powercords/edit           Edit power cord
 *  POST  /inventory/powercords/delete         Delete power cord
 *
 *  GET   /inventory/plugs                     List all plugs
 *  POST  /inventory/plugs/add                 Add plug
 *  POST  /inventory/plugs/edit               Edit plug
 *  POST  /inventory/plugs/delete              Delete plug
 *
 *  GET   /inventory/lights                    List all lights
 *  POST  /inventory/lights/add                Add light
 *  POST  /inventory/lights/edit               Edit light
 *  POST  /inventory/lights/delete             Delete light
 *
 *  GET   /inventory/jumpers                   List all jumpers
 *  POST  /inventory/jumpers/add               Add jumper
 *  POST  /inventory/jumpers/edit              Edit jumper
 *  POST  /inventory/jumpers/delete            Delete jumper
 *
 *  GET   /inventory/controllers               List all controllers
 *  POST  /inventory/controllers/add           Add controller
 *  POST  /inventory/controllers/edit          Edit controller
 *  POST  /inventory/controllers/delete        Delete controller
 *
 *  GET   /inventory/connectors                List all connectors
 *  POST  /inventory/connectors/add            Add connector
 *  POST  /inventory/connectors/edit           Edit connector
 *  POST  /inventory/connectors/delete         Delete connector
 *
 *  GET   /inventory/cables                    List all cables
 *  POST  /inventory/cables/add                Add cable
 *  POST  /inventory/cables/edit               Edit cable
 *  POST  /inventory/cables/delete             Delete cable
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * STATIC
 * ══════════════════════════════════════════════════════════════════════════════
 *  GET   /uploads/:filename                   Serve uploaded files
 *  GET   /test-email?to=email                 Send a test SMTP email
 */

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
import inventoryRoutes from "./routes/inventoryRoutes.js";
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
app.use("/inventory", inventoryRoutes);

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