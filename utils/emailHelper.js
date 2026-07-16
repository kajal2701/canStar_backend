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

// Reverse of encryptParam — decrypts AES-256-CBC token back to original value (quote_no)
export function decryptParam(token) {
  // Undo URL-safe base64: - → +, _ → /, re-pad with =
  let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  const combined = Buffer.from(b64, "base64");
  const iv = combined.subarray(0, 16);
  const encryptedBase64 = combined.subarray(16).toString("utf8");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPT_KEY, iv);
  let decrypted = decipher.update(encryptedBase64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
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

function formatDateUTC(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Customer email resolver ─────────────────────────────────────────────────

/**
 * Resolves the list of email addresses to send to for a given quote.
 *
 * Logic:
 *  - If quote.customer_id exists → fetch customer_tbl.email_json
 *      - email_json has valid entries → send to those ONLY (may already include primary)
 *      - email_json is empty / missing → fall back to quote.email
 *  - If quote.customer_id is null (legacy quote) → use quote.email
 *
 * Duplicates within email_json are silently removed.
 */
async function getCustomerEmails(quote) {
  if (quote.customer_id) {
    const [[customer]] = await pool.query(
      "SELECT email_json FROM customer_tbl WHERE cust_id = ? AND active_state = 1",
      [quote.customer_id]
    );

    if (customer && customer.email_json) {
      let extras = [];
      try {
        extras = typeof customer.email_json === "string"
          ? JSON.parse(customer.email_json)
          : customer.email_json;
      } catch { extras = []; }

      if (Array.isArray(extras)) {
        const valid = [...new Set(
          extras
            .map(e => (e || "").trim().toLowerCase())
            .filter(e => e && e.includes("@"))
        )];
        if (valid.length > 0) return valid;
      }
    }
  }

  // Fallback: legacy quote or empty email_json → use quote's own email
  return quote.email ? [quote.email] : [];
}

// ─── Quote emails ─────────────────────────────────────────────────────────────

// send_for_approval (status=2): "Your Quote Has Arrived" → to customer
export async function sendNewQuoteNotification(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*, COALESCE(qp.part_payment_amount, '0.00') as deposit_amount,
       CONCAT(user_tbl.fname, ' ', user_tbl.lname) AS quote_person
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
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
    quote_person: quote.quote_person || "Canstar Light",
  });

  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: "canstarlightca@gmail.com",
    subject: `Your Quote Has Arrived - Canstar Light [${formatDate(quote.created_at)}]`,
    html,
  });
}

// send_for_approve (status=3) / resend_quote / update_quote: "Quote from Canstar Light!" → to customer, CC admin
export async function sendCustomerQuoteEmail(quote_id, is_updated = false) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*, COALESCE(qp.part_payment_amount, '0.00') as deposit_amount,
       CONCAT(user_tbl.fname, ' ', user_tbl.lname) AS quote_person
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
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
    quote_person: quote.quote_person || "Canstar Light",
  });

  const subject = is_updated
    ? `Updated Quote from Canstar Light [${formatDate(quote.created_at)}]`
    : `Canstar Light Quote [${formatDate(quote.created_at)}]`;
  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  console.log(`Sending quote email to ${emails.join(", ")} with subject "${subject}"`);
  await sendMail({
    to: emails.join(", "),
    cc: "canstarlightca@gmail.com",
    subject,
    html,
  });
}

// send_final_quote: final invoice notification → to customer
export async function sendFinalQuoteNotification(quote_id, sendToCustomer = true) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       qp.payment_id, qp.pending_payment_amount,
       CONCAT(user_tbl.fname, ' ', user_tbl.lname) AS quote_person
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
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
    quote_person: quote.quote_person || "Canstar Light",
  });

  let toEmails = [];
  let ccEmail = "";

  if (sendToCustomer) {
    const emails = await getCustomerEmails(quote);
    if (!emails.length) return;
    toEmails = emails;
    ccEmail = "canstarlightca@gmail.com";
  } else {
    toEmails = ["canstarlightca@gmail.com"];
    ccEmail = "";
  }

  await sendMail({
    to: toEmails.join(", "),
    cc: ccEmail,
    subject: `Final Invoice - Canstar Light`,
    html,
  });
}

// payment_receive: payment confirmation → to customer + admin notification
export async function sendPaymentConfirmation(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       opd.payment_method, opd.created_at as payment_created_at, opd.amount as paid_amount,
       CONCAT(user_tbl.fname, ' ', user_tbl.lname) AS quote_person
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
     LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
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
    quote_person: quote.quote_person || "Canstar Light",
  });

  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: "canstarlightca@gmail.com",
    subject: `Payment Confirmation - Canstar Light`,
    html,
  });
}

// schedule_installation: installation scheduled/rescheduled → to customer
export async function sendInstallationScheduled(quote_id, isRescheduled = false) {
  const [[quote]] = await pool.query(
    "SELECT * FROM quote_tbl WHERE quote_id = ?",
    [quote_id]
  );
  if (!quote) return;

  const installDate = quote.installation_date
    ? formatDateUTC(quote.installation_date)
    : "[Date TBD]";

  // Dynamic content based on new schedule vs reschedule
  const heading = isRescheduled
    ? "📅 Canstar Light Installation Rescheduled"
    : "Canstar Light Installation Scheduled!";
  const intro_text = isRescheduled
    ? "We wanted to let you know that your Canstar Lights installation has been <strong>rescheduled</strong>. Please review the updated details below."
    : "<strong>Important:</strong> Please review this email carefully, as it contains key information about your installation.";
  const note_text = isRescheduled
    ? "<strong>&#9888; Updated Date:</strong> Your installation has been moved to a new date &mdash; please make note of the updated schedule below."
    : "<strong>Site Preparation:</strong> Ensure all areas are cleared to allow ladder access.";
  const html = renderTemplate("installation_scheduled", {
    fname: quote.fname,
    lname: quote.lname,
    address: quote.address ?? "",
    city: quote.city ?? "",
    state: quote.state ?? "",
    country: quote.country ?? "",
    installDate,
    heading,
    intro_text,
    note_text,
  });

  const subject = isRescheduled
    ? `Your Canstar Light Installation Has Been Rescheduled`
    : `Your Canstar Light Installation is Scheduled`;

  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: "canstarlightca@gmail.com",
    subject,
    html,
  });
}

// schedule_installation: installer assigned/reassigned notification → to installer
export async function sendInstallerAssignedEmail(quote_id, isRescheduled = false) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(installer.fname,' ',installer.lname) as installer_name,
       installer.fname as installer_fname,
       installer.email as installer_email
     FROM quote_tbl
     LEFT JOIN user_tbl AS installer ON installer.user_id = quote_tbl.installer_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote || !quote.installer_email) return;

  const installDate = quote.installation_date
    ? formatDateUTC(quote.installation_date)
    : "[Date TBD]";

  // Dynamic content based on new assignment vs reassignment
  const heading = isRescheduled
    ? "📅 Installation Rescheduled — Update"
    : "New Installation Assigned!";
  const intro_text = isRescheduled
    ? "The installation you are assigned to has been <strong>rescheduled</strong>. Please take note of the updated date below."
    : "You have been assigned a new installation. Please review the details below:";
  const html = renderTemplate("installer_assigned", {
    installer_fname: quote.installer_fname ?? "Installer",
    quote_no: quote.quote_no,
    customer_name: `${quote.fname} ${quote.lname}`,
    address: quote.address ?? "",
    city: quote.city ?? "",
    state: quote.state ?? "",
    country: quote.country ?? "",
    installDate,
    heading,
    intro_text,
  });

  const subject = isRescheduled
    ? `Installation Rescheduled — ${quote.quote_no}`
    : `New Installation Assigned - ${quote.quote_no}`;

  await sendMail({
    to: quote.installer_email,
    cc: "canstarlightca@gmail.com",
    subject,
    html,
  });
}

// delete_quote: quote deleted → to admin/salesman
export async function sendDeleteQuoteEmail(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*, CONCAT(user_tbl.fname, ' ', user_tbl.lname) AS quote_person, user_tbl.email AS quote_person_email
     FROM quote_tbl 
     LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id 
     WHERE quote_tbl.quote_id = ?`,
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
    quote_person: quote.quote_person || "Canstar Light",
  });

  const recipients = [
    quote.quote_person_email,
    "canstarlightca@gmail.com",
  ].filter(Boolean);

  await sendMail({
    to: recipients.join(", "),
    subject: `Quote Deleted - ${quote.quote_no}`,
    html,
  });
}

// ─── Payment admin emails ─────────────────────────────────────────────────────

// processPayment / processPaymentfinal: notify admin of payment received
export async function sendPaymentReceiveAdmin(quote_id, is_final = false) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman,
       COALESCE(SUM(ann.total_numerical_box), 0) as total_numerical_box,
       GROUP_CONCAT(DISTINCT ann.color SEPARATOR ', ') as channel_color
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
    channel_color: quote.channel_color ?? "-",
    admin_notes: quote.adminnotes ?? "None",
    customer_notes: quote.notes ?? "None",
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
       opd.amount as paid_amount,
       CONCAT(user_tbl.fname, ' ', user_tbl.lname) AS quote_person
     FROM quote_tbl
     LEFT JOIN quote_payment qp ON qp.quote_id = quote_tbl.quote_id
     LEFT JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
     LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
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
    quote_person: quote.quote_person || "Canstar Light",
  });

  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: "canstarlightca@gmail.com",
    subject: `Full Payment Received - Canstar Light`,
    html,
  });
}

// ─── Installation process emails ──────────────────────────────────────────────

// on_the_way: installer is heading to the job site → to customer + CC quote person
// Replies go to the quote person (salesman) and admin
export async function sendOnTheWayEmail(quote_id, etaMinutes) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(salesman.fname,' ',salesman.lname) as salesman_name,
       salesman.email as salesman_email,
       CONCAT(installer_tbl.fname,' ',installer_tbl.lname) as installer_name
     FROM quote_tbl
     JOIN user_tbl AS salesman ON salesman.user_id = quote_tbl.user_id
     LEFT JOIN user_tbl AS installer_tbl ON installer_tbl.user_id = quote_tbl.installer_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("on_the_way", {
    fname: quote.fname,
    lname: quote.lname,
    installer_name: quote.installer_name || "Your Installer",
    eta: etaMinutes,
    quote_no: quote.quote_no,
    address: quote.address ?? "",
    city: quote.city ?? "",
  });

  // Build replyTo: quote person (salesman) + admin
  const replyToAddresses = [
    quote.salesman_email,
    "canstarlightca@gmail.com",
  ].filter(Boolean).join(", ");

  // Send to customer, CC the quote person (salesman)
  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: quote.salesman_email || "canstarlightca@gmail.com",
    subject: `Your Installer is On The Way! - Canstar Light`,
    html,
    replyTo: replyToAddresses,
  });
}

// controller_box_confirmation: photo of proposed controller box location → customer
export async function sendControllerBoxConfirmation(quote_id, photoUrl) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(salesman.fname,' ',salesman.lname) as salesman_name,
       salesman.email as salesman_email
     FROM quote_tbl
     JOIN user_tbl AS salesman ON salesman.user_id = quote_tbl.user_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("controller_box_confirmation", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    address: quote.address ?? "",
    city: quote.city ?? "",
    photo_url: photoUrl,
  });

  const replyToAddresses = [
    quote.salesman_email,
    "canstarlightca@gmail.com",
  ].filter(Boolean).join(", ");

  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: quote.salesman_email || "canstarlightca@gmail.com",
    subject: `Controller Box Location Confirmation - Canstar Light`,
    html,
    replyTo: replyToAddresses,
  });
}

// pre_assessment: assessment images + notes → customer
export async function sendPreAssessmentEmail(quote_id, images, notes) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(salesman.fname,' ',salesman.lname) as salesman_name,
       salesman.email as salesman_email
     FROM quote_tbl
     JOIN user_tbl AS salesman ON salesman.user_id = quote_tbl.user_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  // Build notes section HTML
  const notesHtml = notes?.trim()
    ? `<div class="notes-box"><div class="notes-label">Installer Notes</div><div class="notes-text">${notes}</div></div>`
    : "";

  // Build images section HTML
  let imagesHtml = "";
  if (images && images.length > 0) {
    imagesHtml = `<div class="images-section"><div class="images-label">Assessment Photos</div>`;
    for (const img of images) {
      imagesHtml += `<img src="${img}" alt="Assessment Photo" />`;
    }
    imagesHtml += `</div>`;
  }

  const html = renderTemplate("pre_assessment", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    address: quote.address ?? "",
    city: quote.city ?? "",
    notes_section: notesHtml,
    images_section: imagesHtml,
  });

  const replyToAddresses = [
    quote.salesman_email,
    "canstarlightca@gmail.com",
  ].filter(Boolean).join(", ");

  const emails = await getCustomerEmails(quote);
  if (!emails.length) return;
  await sendMail({
    to: emails.join(", "),
    cc: quote.salesman_email || "canstarlightca@gmail.com",
    subject: `Pre-Installation Assessment - Canstar Light`,
    html,
    replyTo: replyToAddresses,
  });
}

// installation_complete: notify admin + salesman when installer finishes job
export async function sendInstallationCompleteEmail(quote_id) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(salesman.fname,' ',salesman.lname) as salesman_name,
       salesman.email as salesman_email
     FROM quote_tbl
     JOIN user_tbl AS salesman ON salesman.user_id = quote_tbl.user_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  // Get the install process data for the summary
  const [[process]] = await pool.query(
    `SELECT ip.*, CONCAT(installer.fname,' ',installer.lname) as installer_name
     FROM install_process_tbl ip
     LEFT JOIN user_tbl AS installer ON installer.user_id = ip.installer_id
     WHERE ip.quote_id = ?`,
    [quote_id]
  );

  // Parse saved step data
  const parseJson = (val) => {
    if (!val) return {};
    if (typeof val === "string") { try { return JSON.parse(val); } catch { return {}; } }
    return val;
  };

  const prep = parseJson(process?.prep_data);
  const timeEntry = parseJson(process?.time_entry_data);
  const dropOff = parseJson(process?.drop_off_data);
  const postInstall = parseJson(process?.post_install_data);

  // Calculate duration
  let duration = "—";
  if (timeEntry.startTime && timeEntry.endTime) {
    const [sh, sm] = timeEntry.startTime.split(":").map(Number);
    const [eh, em] = timeEntry.endTime.split(":").map(Number);
    let diffMin = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMin < 0) diffMin += 24 * 60;
    duration = `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  }

  // Travel time
  const travelHrs = dropOff?.travelTime?.hours || 0;
  const travelMin = dropOff?.travelTime?.minutes || 0;
  const travelTime = `${travelHrs}h ${travelMin}m`;

  // Expenses
  const totalExpenses = (timeEntry.expenses || [])
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    .toFixed(2);

  // Photo count
  const photoCount = (postInstall?.images || []).length;

  // Build checklist summary HTML
  const checklist = postInstall?.checklist || {};
  let checklistHtml = "";
  const checklistEntries = Object.entries(checklist);
  if (checklistEntries.length > 0) {
    checklistHtml = `<table class="summary-table"><tr><th>Item</th><th>Used</th><th>Waste</th><th>Notes</th></tr>`;
    for (const [key, val] of checklistEntries) {
      if (val.used || val.waste) {
        checklistHtml += `<tr><td class="label">${key}</td><td class="value">${val.used || "—"}</td><td class="value">${val.waste || "—"}</td><td>${val.notes || ""}</td></tr>`;
      }
    }
    checklistHtml += `</table>`;
  }

  const completedAt = process?.completed_at
    ? new Date(process.completed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  const html = renderTemplate("installation_complete", {
    customer_name: `${quote.fname} ${quote.lname}`,
    quote_no: quote.quote_no,
    quote_id: quote.quote_id,
    address: quote.address ?? "",
    city: quote.city ?? "",
    installer_name: process?.installer_name || "Not assigned",
    completed_at: completedAt,
    linear_feet: prep.linearFeet || quote.total_numerical_box || 0,
    duration,
    travel_time: travelTime,
    total_expenses: totalExpenses,
    photo_count: photoCount,
    checklist_section: checklistHtml,
  });

  // Send to admin + salesman (NOT the customer)
  const recipients = [
    quote.salesman_email,
    "canstarlightca@gmail.com",
  ].filter(Boolean);

  await sendMail({
    to: recipients.join(", "),
    subject: `Installation Completed — ${quote.fname} ${quote.lname} (${quote.quote_no}) - Canstar Light`,
    html,
  });
}

// followup_scheduled: notify admin + salesman when a follow up date is set
export async function sendFollowupScheduledEmail(quote_id, followup_date) {
  const [[quote]] = await pool.query(
    `SELECT quote_tbl.*,
       CONCAT(salesman.fname,' ',salesman.lname) as salesman_name,
       salesman.email as salesman_email
     FROM quote_tbl
     JOIN user_tbl AS salesman ON salesman.user_id = quote_tbl.user_id
     WHERE quote_tbl.quote_id = ?`,
    [quote_id]
  );
  if (!quote) return;

  const html = renderTemplate("followup_scheduled", {
    fname: quote.fname,
    lname: quote.lname,
    quote_no: quote.quote_no,
    quote_id: quote.quote_id,
    followup_date: followup_date,
    salesman: quote.salesman_name,
  });

  const recipients = [
    quote.salesman_email,
    "canstarlightca@gmail.com",
  ].filter(Boolean);

  await sendMail({
    to: recipients.join(", "),
    subject: `Follow-Up Scheduled — ${quote.fname} ${quote.lname} (${quote.quote_no}) - Canstar Light`,
    html,
  });
}
