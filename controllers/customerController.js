import pool from "../db.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// GET /customer/manage_customer
export const manage_customer = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM customer_tbl WHERE active_state = 1 ORDER BY cust_id DESC"
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /customer/add_customer_process
// Body: { fname, lname, email, phone, street, city, state, gst, post_code, country }
export const add_customer_process = async (req, res) => {
  try {
    const { fname, lname, email, phone, street, city, state, gst, post_code, country } = req.body;

    // Check duplicate email
    const [existing] = await pool.query(
      "SELECT * FROM customer_tbl WHERE email = ?", [email]
    );
    if (existing.length > 0) {
      return res.status(200).json({
        success: false,
        status_code: 0,
        message: "This email id already Csutomer. Please try again.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO customer_tbl (fname, lname, email, phone, address, city, state, gst, post_code, country, active_state, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [fname, lname, email, phone, street, city, state, gst, post_code, country, now()]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Csutomer added successful." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /customer/edit_customer/:customer_id
export const get_customer_by_id = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM customer_tbl WHERE cust_id = ?", [customer_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /customer/update_customer_process
// Body: { customer_id, fname, lname, email, phone, street, city, state, gst, country, post_code }
export const update_customer_process = async (req, res) => {
  try {
    const { customer_id, fname, lname, email, phone, street, city, state, gst, country, post_code } = req.body;

    // Check email conflict with other customers
    const [conflict] = await pool.query(
      "SELECT * FROM customer_tbl WHERE email = ? AND cust_id != ? AND active_state = 1",
      [email, customer_id]
    );
    if (conflict.length > 0) {
      return res.status(200).json({
        success: false,
        status_code: 0,
        message: "This email id already exists for another customer.",
      });
    }

    const [result] = await pool.query(
      `UPDATE customer_tbl SET fname=?, lname=?, email=?, phone=?, address=?, city=?, state=?, gst=?, country=?, post_code=?, modified_at=?
       WHERE cust_id=?`,
      [fname, lname, email, phone, street, city, state, gst, country, post_code, now(), customer_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Customer updated successfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "No changes made or failed to update customer." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /customer/delete_customer
// Body: { customer_id }
export const delete_customer = async (req, res) => {
  try {
    const { customer_id } = req.body;
    const [result] = await pool.query(
      "UPDATE customer_tbl SET active_state = 0, modified_at = ? WHERE cust_id = ?",
      [now(), customer_id]
    );
    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Customer deleted successfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "Failed to delete customer." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
