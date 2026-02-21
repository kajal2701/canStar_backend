import pool from "../db.js";

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
