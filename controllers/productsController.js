import pool from "../db.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// GET /products/manage_products
export const manage_products = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM product_tbl WHERE status = 1"
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /products/add_product_process
// Body: { title, sku, description, inventory, price, type, channel_color }
export const add_product_process = async (req, res) => {
  try {
    const { title, sku, description, inventory, price, type, channel_color } = req.body;

    // Check duplicate SKU
    const [existing] = await pool.query(
      "SELECT * FROM product_tbl WHERE sku = ? AND status = 1", [sku]
    );
    if (existing.length > 0) {
      return res.status(200).json({
        success: false,
        status_code: 0,
        message: "This SKU is already exsts. Please try again.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO product_tbl (product_title, sku, product_description, inventory, price, type, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, sku, description, inventory, price, type, channel_color, now()]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "product added successful." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /products/edit_product/:product_id
export const edit_product = async (req, res) => {
  try {
    const { product_id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM product_tbl WHERE product_id = ?", [product_id]
    );
    return res.status(200).json({ success: true, data: rows[0] || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /products/edit_product_process
// Body: { product_id, title, sku, description, inventory, price, type, channel_color }
export const edit_product_process = async (req, res) => {
  try {
    const { product_id, title, sku, description, inventory, price, type, channel_color } = req.body;

    const [result] = await pool.query(
      `UPDATE product_tbl SET product_title=?, sku=?, product_description=?, inventory=?, price=?, type=?, color=?
       WHERE product_id=?`,
      [title, sku, description, inventory, price, type, channel_color, product_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Product Edit sucessfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /products/delete_product
// Body: { product_id }
export const delete_product = async (req, res) => {
  try {
    const { product_id } = req.body;
    const [result] = await pool.query(
      "UPDATE product_tbl SET status = 0 WHERE product_id = ?", [product_id]
    );
    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Product delete sucessfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed to delete product.", product_id });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
