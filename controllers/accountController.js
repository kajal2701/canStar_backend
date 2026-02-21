import pool from "../db.js";

// POST /account/login_process
// Body: { email, password }
export const login_process = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        status_code: 0,
        message: "Email and password are required",
      });
    }

    // Match PHP: base64_encode($this->input->post('password'))
    const encodedPassword = Buffer.from(password).toString("base64");

    // Match PHP: WHERE email = ? AND password = ?  on user_tbl
    const [rows] = await pool.query(
      "SELECT * FROM user_tbl WHERE email = ? AND password = ?",
      [email, encodedPassword]
    );

    if (rows.length > 0) {
      const user = rows[0];
      return res.status(200).json({
        success: true,
        status_code: 1,
        message: "Login successful.",
        data: user,
      });
    } else {
      return res.status(401).json({
        success: false,
        status_code: 0,
        message: "Invalid login or password.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /account/profile/:user_id
export const profile = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM user_tbl WHERE user_id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /account/edit_profile_process
// Body: { user_id, name, password }
export const edit_profile_process = async (req, res) => {
  try {
    const { user_id, name, password } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    // Match PHP: base64_encode($this->input->post('password'))
    const encodedPassword = Buffer.from(password || "").toString("base64");

    const [result] = await pool.query(
      "UPDATE user_tbl SET name = ?, password = ? WHERE user_id = ?",
      [name, encodedPassword, user_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        status_code: "1",
        message: "Profile Edit sucessfully.",
      });
    } else {
      return res.status(200).json({
        success: false,
        status_code: "0",
        message: "failed.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
