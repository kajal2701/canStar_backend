import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import pool from "../db.js";
import { sendMail } from "./mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "../email_templates");

// AES-256-CBC encryption matching PHP encryptQuoteParam
// PHP key is 28 chars, null-padded to 32; PHP openssl_encrypt returns base64 by default
const ENCRYPT_KEY = Buffer.alloc(32);
Buffer.from("a8f9JkLpQeRmSx2YvBnCzDtUgWx1", "utf8").copy(ENCRYPT_KEY);

function encryptParam(value) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPT_KEY, iv);
  let encrypted = cipher.update(value, "utf8", "base64");
  encrypted += cipher.final("base64");
  // PHP: base64_encode($iv . $encrypted) — iv is raw bytes, encrypted is base64 string
  const combined = Buffer.concat([iv, Buffer.from(encrypted, "utf8")]).toString("base64");
  return combined.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function renderTemplate(templateName, vars) {
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  let html = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }
  return html;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Quote emails ─────────────────────────────────────────────────────────────

// send_for_approval (status=2): "Your Quote Has Arrived" → to customer
export async function sendNewQuoteNotification(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*, COALESCE(qp.part_payment_amount, '0.00') as deposit_amount
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("new_quote_notification", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    formattedDate: formatDate(quote.created_at),
    expiryDate: addDays(quote.created_at, 4),
    main_total: quote.main_total,
    encryptedQuoteNo: encryptParam(quote.quote_no),
  });

  await sendMail({
    to: quote.email,
    subject: `Your Quote Has Arrived - Canstar Light [${formatDate(quote.created_at)}]`,
    html,
  });
}

// send_for_approve (status=3) / resend_quote / update_quote: "Quote from Canstar Light!" → to customer, CC admin
export async function sendCustomerQuoteEmail(quote_id, is_updated = false) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*, COALESCE(qp.part_payment_amount, '0.00') as deposit_amount
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("new_approved_quote_email", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    formattedDate: formatDate(quote.created_at),
    expiryDate: addDays(quote.created_at, 4),
    deposit_amount: quote.deposit_amount,
    main_total: quote.main_total,
    encryptedQuoteNo: encryptParam(quote.quote_no),
  });

  const subject = is_updated
    ? `Updated Quote from Canstar Light [${formatDate(quote.created_at)}]`
    : `Canstar Light Quote [${formatDate(quote.created_at)}]`;
  console.log(`Sending quote email to ${quote.email} with subject "${subject}"`);
  await sendMail({
    to: quote.email,
    cc: "canstarlightca@gmail.com",
    subject,
    html,
  });
}

// send_final_quote: final invoice notification → to customer
export async function sendFinalQuoteNotification(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       qp.payment_id, qp.pending_payment_amount
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("final_quote_notification", {
    fname: quote.fname,
    lname: quote.lname,
    payment_id: quote.payment_id ?? "",
    formattedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    balanceAmount: parseFloat(quote.pending_payment_amount ?? quote.main_total).toFixed(2),
    encryptedQuoteNo: encryptParam(quote.quote_no),
  });

  await sendMail({
    to: quote.email,
    subject: `Final Invoice - Canstar Light`,
    html,
  });
}

// payment_receive: payment confirmation → to customer + admin notification
export async function sendPaymentConfirmation(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       opd.payment_method, opd.created_at as payment_created_at, opd.amount as paid_amount
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
     WHERE quote_tbl.quote_id = ?
     ORDER BY opd.online_payment_id DESC
     LIMIT 1`,
    [quote_id]
  );
  if (!quote) return;

  const paymentDate = quote.payment_created_at ? formatDate(quote.payment_created_at) : formatDate(new Date());
  const totalPaid = parseFloat(quote.paid_amount ?? quote.main_total).toFixed(2);

  const html = renderTemplate("payment_confirmation", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    paymentDate,
    totalPaid,
    encryptedQuoteNo: encryptParam(quote.quote_no),
  });

  await sendMail({
    to: quote.email,
    subject: `Payment Confirmation - Canstar Light`,
    html,
  });
}

// schedule_installation: installation scheduled → to customer
export async function sendInstallationScheduled(quote_id) {
  const [[quote]] = await pool.query(
    "SELECT * FROM quote_tbl WHERE quote_id = ?",
    [quote_id]
  );
  if (!quote) return;

  const installDate = quote.installation_date
    ? formatDate(quote.installation_date)
    : "[Date TBD]";

  const html = renderTemplate("installation_scheduled", {
    fname: quote.fname,
    lname: quote.lname,
    address: quote.address ?? "",
    city: quote.city ?? "",
    state: quote.state ?? "",
    country: quote.country ?? "",
    installDate,
  });

  await sendMail({
    to: quote.email,
    subject: `Your Canstar Light Installation is Scheduled`,
    html,
  });
}

// delete_quote: quote deleted → to customer
export async function sendDeleteQuoteEmail(quote_id) {
  const [[quote]] = await pool.query(
    "SELECT * FROM quote_tbl WHERE quote_id = ?",
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("delete_quote_email", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    formattedDate: formatDate(quote.created_at),
    expiryDate: addDays(quote.created_at, 4),
    main_total: quote.main_total,
  });

  await sendMail({
    to: quote.email,
    subject: `Your Quote Has Been Deleted - Canstar Light`,
    html,
  });
}

// ─── Payment admin emails ─────────────────────────────────────────────────────

// processPayment / processPaymentfinal: notify admin of payment received
export async function sendPaymentReceiveAdmin(quote_id, is_final = false) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman,
       COALESCE(SUM(ann.total_numerical_box), 0) as total_numerical_box
     FROM quote_tbl
     JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
     LEFT JOIN annotation_image_tbl ann ON ann.quote_id = quote_tbl.quote_id
     WHERE quote_tbl.quote_id = ?
     GROUP BY quote_tbl.quote_id`,
    [quote_id]
  );
  if (!quote) return;

  const [payments] = await pool.query(
    `SELECT opd.payment_method, opd.created_at, opd.amount
     FROM online_payment_details opd
     WHERE opd.quote_id = ?
     ORDER BY opd.online_payment_id DESC
     LIMIT 1`,
    [quote_id]
  );
  const payment = payments[0] || {};

  const paymentMethod = payment.payment_method ?? "Unknown";
  const paymentDate = payment.created_at ? formatDate(payment.created_at) : formatDate(new Date());
  const totalPaid = parseFloat(payment.amount ?? 0).toFixed(2);

  const html = renderTemplate("payment_receive_admin", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    quote_id: quote.quote_id,
    salesman: quote.salesman,
    main_total: quote.main_total,
    total_numerical_box: quote.total_numerical_box ?? "-",
    paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace(/_/g, " "),
    paymentDate,
    totalPaid,
  });

  const subject = is_final
    ? `Final Payment Sent from [${quote.fname} ${quote.lname}]`
    : `Payment Sent from [${quote.fname} ${quote.lname}]`;

  await sendMail({
    to: "canstarlightca@gmail.com",
    subject,
    html,
  });
}

// payment_receive (admin confirms): full payment receipt → to customer
export async function sendInvoiceFullPaymentReceipt(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       qp.payment_id,
       opd.created_at as payment_created_at,
       opd.amount as paid_amount
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
     WHERE quote_tbl.quote_id = ?
     ORDER BY opd.online_payment_id DESC
     LIMIT 1`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("invoice_full_payment_receipt", {
    fname: quote.fname,
    lname: quote.lname,
    payment_id: quote.payment_id ?? "",
    formattedDate: quote.payment_created_at ? formatDate(quote.payment_created_at) : formatDate(new Date()),
    amountPaid: parseFloat(quote.paid_amount ?? 0).toFixed(2),
    encryptedQuoteNo: encryptParam(quote.quote_no),
  });

  await sendMail({
    to: quote.email,
    subject: `Full Payment Received - Canstar Light`,
    html,
  });
}
