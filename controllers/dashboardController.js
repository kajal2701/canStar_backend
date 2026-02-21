import pool from "../db.js";

// GET /dashboard
// Returns counts + quote list (role-aware via query param: ?user_id=X&role=Y)
export const get_dashboard = async (req, res) => {
  try {
    const { user_id, role } = req.query;

    // Total quotes
    const [[{ total_quotes }]] = await pool.query(
      "SELECT COUNT(*) as total_quotes FROM quote_tbl"
    );

    // Total approved quotes (status = 1)
    const [[{ total_approved_quotes }]] = await pool.query(
      "SELECT COUNT(*) as total_approved_quotes FROM quote_tbl WHERE status = 1"
    );

    // Total active users
    const [[{ total_users }]] = await pool.query(
      "SELECT COUNT(*) as total_users FROM user_tbl WHERE active_state = 1"
    );

    // Total active products
    const [[{ total_products }]] = await pool.query(
      "SELECT COUNT(*) as total_products FROM product_tbl WHERE status = 1"
    );

    // Manage quote list (role-aware)
    let quoteQuery = `
      SELECT quote_tbl.*, CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman
      FROM quote_tbl
      JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
    `;
    const params = [];
    if (role && role != 1) {
      quoteQuery += " WHERE user_tbl.user_id = ?";
      params.push(user_id);
    }
    quoteQuery += " ORDER BY quote_id DESC";

    const [quotes] = await pool.query(quoteQuery, params);

    return res.status(200).json({
      success: true,
      data: {
        total_quotes,
        total_approved_quotes,
        total_users,
        total_products,
        quotes,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
