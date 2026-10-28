import pool from "../db.js";
import { sendPaymentReceiveAdmin } from "../utils/emailHelper.js";
import { monerisPurchase } from "../utils/moneris.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// Charge the card through Moneris; throws with the bank's message if not approved
// Body fields used: cc_number, cc_expiry (MMYY), cc_cvv
const chargeCard = async (data, amount) => {
  const { quote_id, cc_number, cc_expiry, cc_cvv } = data;
  if (!cc_number || !cc_expiry || !cc_cvv) throw new Error("Card details are required");
  if (!(parseFloat(amount) > 0)) throw new Error("Invalid payment amount");

  const result = await monerisPurchase({
    order_id: `q${quote_id}-${Date.now()}`,
    cust_id: quote_id,
    amount,
    pan: cc_number,
    expiry_mmyy: cc_expiry,
    cvd: cc_cvv,
  });
  if (!result.approved) throw new Error(`Card declined: ${result.message}`);
  return result;
};

// Helper: update quote_tbl and delete removed annotation images
const quotedata_changes = async (data) => {
  await pool.query(
    `UPDATE quote_tbl SET
      product_data = ?,
      custom_product_data = ?,
      total_controller_price = ?,
      total_feet_price = ?,
      gst = ?,
      main_total = ?
    WHERE quote_id = ?`,
    [
      data.product_data_json,
      data.custom_product_data_json,
      data["total-controller-input"],
      data["total-feet-input"],
      data["gst-input"],
      parseFloat(data["total-input"]).toFixed(2),
      data.quote_id,
    ]
  );

  if (data.amount && data.payment_id) {
    await pool.query(
      "UPDATE quote_payment SET part_payment_amount = ? WHERE payment_id = ?",
      [parseFloat(data.amount).toFixed(2), data.payment_id]
    );
  }

  if (data.annotation_image_ids) {
    const ids = String(data.annotation_image_ids)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length > 0) {
      await pool.query(
        "DELETE FROM annotation_image_tbl WHERE annotation_image_id IN (?)",
        [ids]
      );
    }
  }
};

// POST /payment/processPayment
// Body (multipart/form-data): quote_id, payment_id, amount, payment_method,
//   product_data_json, custom_product_data_json, total-controller-input,
//   total-feet-input, gst-input, total-input, annotation_image_ids
//   For credit_card: cc_name, cc_number, cc_expiry, cc_cvv (charged via Moneris)
//   For etransfer: file field "etransfer_screenshot"
export const processPayment = async (req, res) => {
  try {
    const data = req.body;
    const { quote_id, payment_id, amount, payment_method } = data;

    if (payment_method === "credit_card") {
      let receipt;
      try {
        receipt = await chargeCard(data, amount);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
      const [result] = await pool.query("INSERT INTO online_payment_details SET ?", [
        {
          quote_id,
          payment_id,
          auth_code: receipt.auth_code,
          transaction_id: receipt.order_id,
          payment_method,
          amount: receipt.amount,
          status: 0,
          created_at: now(),
        },
      ]);
      if (result.affectedRows > 0) {
        await quotedata_changes({ ...data, amount: receipt.amount });
        sendPaymentReceiveAdmin(quote_id).catch(() => { });
      }
      return res.status(200).json({ success: true, status_code: "1", message: "Credit card payment successfully!" });
    } else if (payment_method === "etransfer") {
      const etransfer_image =
        req.file ? `uploads/${req.file.filename}` : "";
      const [result] = await pool.query("INSERT INTO online_payment_details SET ?", [
        {
          quote_id,
          payment_id,
          amount,
          payment_method,
          etransfer_image,
          status: 0,
          created_at: now(),
        },
      ]);
      if (result.affectedRows > 0) {
        await quotedata_changes(data);
        sendPaymentReceiveAdmin(quote_id).catch(() => { });
      }
      const message = `You still need to complete the payment from your bank account.\nPlease send an e-Transfer of $${amount} to info@canstarlight.ca`;
      return res.status(200).json({ success: true, status_code: "1", message });
    } else {
      // cash
      const [result] = await pool.query("INSERT INTO online_payment_details SET ?", [
        {
          quote_id,
          payment_id,
          amount,
          status: 0,
          payment_method,
          created_at: now(),
        },
      ]);
      if (result.affectedRows > 0) {
        await quotedata_changes(data);
        sendPaymentReceiveAdmin(quote_id).catch(() => { });
      }
      return res.status(200).json({ success: true, status_code: "1", message: "Cash payment successfully!" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /payment/processPaymentfinal
// Same body fields as processPayment (final payment — no quotedata_changes)
export const processPaymentfinal = async (req, res) => {
  try {
    const data = req.body;
    const { quote_id, payment_id, amount, payment_method } = data;

    if (payment_method === "credit_card") {
      // Charge the pending balance from the database, not the amount sent by the browser
      const [[payment]] = await pool.query(
        "SELECT pending_payment_amount FROM quote_payment WHERE payment_id = ? AND quote_id = ?",
        [payment_id, quote_id]
      );
      if (!payment) {
        return res.status(404).json({ success: false, message: "Payment details not found" });
      }
      let receipt;
      try {
        receipt = await chargeCard(data, payment.pending_payment_amount);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
      const [result] = await pool.query("INSERT INTO online_payment_details SET ?", [
        {
          quote_id,
          payment_id,
          auth_code: receipt.auth_code,
          transaction_id: receipt.order_id,
          payment_method,
          status: 0,
          amount: receipt.amount,
          created_at: now(),
        },
      ]);
      if (result.affectedRows > 0) {
        sendPaymentReceiveAdmin(quote_id, true).catch(() => { });
      }
      return res.status(200).json({ success: true, status_code: "1", message: "Credit card payment successfully!" });
    } else if (payment_method === "etransfer") {
      const etransfer_image =
        req.file ? `uploads/${req.file.filename}` : "";
      const [result] = await pool.query("INSERT INTO online_payment_details SET ?", [
        {
          quote_id,
          payment_id,
          amount,
          payment_method,
          etransfer_image,
          status: 0,
          created_at: now(),
        },
      ]);
      if (result.affectedRows > 0) {
        sendPaymentReceiveAdmin(quote_id, true).catch(() => { });
      }
      const message = `You still need to complete the payment from your bank account.\nPlease send an e-Transfer of $${amount} to info@canstarlight.ca`;
      return res.status(200).json({ success: true, status_code: "1", message });
    } else {
      // cash
      const [result] = await pool.query("INSERT INTO online_payment_details SET ?", [
        {
          quote_id,
          payment_id,
          amount,
          status: 0,
          payment_method,
          created_at: now(),
        },
      ]);
      if (result.affectedRows > 0) {
        sendPaymentReceiveAdmin(quote_id, true).catch(() => { });
      }
      return res.status(200).json({ success: true, status_code: "1", message: "Cash payment successfully!" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /payment/manage_invoice?user_id=X&role=Y
export const manage_invoice = async (req, res) => {
  try {
    const { user_id, role } = req.query;

    let query = `
      SELECT online_payment_details.*,
        quote_tbl.quote_no,
        quote_tbl.main_total,
        CONCAT(quote_tbl.fname, ' ', quote_tbl.lname) as customer_name,
        CONCAT(user_tbl.fname, ' ', user_tbl.lname) as salesman
      FROM online_payment_details
      LEFT JOIN quote_tbl ON quote_tbl.quote_id = online_payment_details.quote_id
      LEFT JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
    `;
    const params = [];

    if (role && role != 1) {
      query += " WHERE user_tbl.user_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY online_payment_details.online_payment_id DESC";

    const [rows] = await pool.query(query, params);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
