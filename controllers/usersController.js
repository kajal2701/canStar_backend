import pool from "../db.js";

// GET /users/manage_user
export const manage_user = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM user_tbl WHERE active_state = 1 ORDER BY user_id ASC"
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /users/add_user_process
// Body: { fname, lname, email, password, role }
export const add_user_process = async (req, res) => {
  try {
    const { fname, lname, email, password, role } = req.body;

    // Check duplicate email
    const [existing] = await pool.query(
      "SELECT * FROM user_tbl WHERE email = ? AND active_state = 1",
      [email]
    );
    if (existing.length > 0) {
      return res.status(200).json({
        success: false,
        status_code: 0,
        message: "This email id already user. Please try again.",
      });
    }

    const encodedPassword = Buffer.from(password).toString("base64");
    const created_at = new Date().toISOString().slice(0, 19).replace("T", " ");

    const [result] = await pool.query(
      "INSERT INTO user_tbl (fname, lname, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [fname, lname, email, encodedPassword, role, created_at]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "User added successful." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /users/edit_user/:user_id
export const edit_user = async (req, res) => {
  try {
    const { user_id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM user_tbl WHERE user_id = ?",
      [user_id]
    );
    return res.status(200).json({ success: true, data: rows[0] || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /users/edit_user_process
// Body: { user_id, fname, lname, email, password, role }
export const edit_user_process = async (req, res) => {
  try {
    const { user_id, fname, lname, email, password, role } = req.body;
    const encodedPassword = Buffer.from(password).toString("base64");

    const [result] = await pool.query(
      "UPDATE user_tbl SET fname=?, lname=?, email=?, password=?, role=? WHERE user_id=?",
      [fname, lname, email, encodedPassword, role, user_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "User Edit sucessfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /users/delete_user
// Body: { user_id }
export const delete_user = async (req, res) => {
  try {
    const { user_id } = req.body;

    const [result] = await pool.query(
      "UPDATE user_tbl SET active_state = 0 WHERE user_id = ?",
      [user_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "User delete sucessfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
