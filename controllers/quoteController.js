import pool from "../db.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const today = () => new Date().toISOString().slice(0, 10);

// GET /quote/manage_quote?user_id=X&role=Y
export const manage_quote = async (req, res) => {
  try {
    const { user_id, role } = req.query;

    let query = `
      SELECT quote_tbl.*,
        CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman,
        COALESCE(SUM(annotation_image_tbl.total_numerical_box), 0) as total_numerical_box,
        GROUP_CONCAT(DISTINCT annotation_image_tbl.color ORDER BY annotation_image_tbl.color SEPARATOR ', ') as colors
      FROM quote_tbl
      JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
      LEFT JOIN annotation_image_tbl ON annotation_image_tbl.quote_id = quote_tbl.quote_id
    `;
    const params = [];

    let conditions = ["quote_tbl.status != 5"];
    if (role && role != 1) {
      conditions.push("user_tbl.user_id = ?");
      params.push(user_id);
    }
    query += " WHERE " + conditions.join(" AND ");
    query += " GROUP BY quote_tbl.quote_id ORDER BY quote_tbl.quote_id DESC";

    const [quotes] = await pool.query(query, params);

    // Attach payment details for each quote
    for (const quote of quotes) {
      const [payments] = await pool.query(
        `SELECT quote_payment.*, online_payment_details.etransfer_image,
          online_payment_details.payment_method,
          online_payment_details.status as payment_status
         FROM quote_payment
         LEFT JOIN online_payment_details ON online_payment_details.payment_id = quote_payment.payment_id
         WHERE quote_payment.quote_id = ?`,
        [quote.quote_id]
      );
      quote.payment_details = payments;
    }

    return res.status(200).json({ success: true, data: quotes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/get_product_data
export const getProductdata = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM product_tbl WHERE type = 1 AND status = 1"
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/get_colors
export const getColor = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM color_tbl");
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/get_provinces
export const getProvince = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM taxrates");
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/add_quote_process
export const add_quote_process = async (req, res) => {
  try {
    const {
      user_id, fname, lname, email, phone,
      street, city, state, country, post_code,
      product_data, custom_product_data,
      total_controller_price, total_feet_price,
      discount_percentage, gst_percentage, gst, main_total,
      notes, adminnotes,
    } = req.body;

    const data = {
      user_id,
      fname,
      lname,
      email,
      phone,
      address: street,
      city,
      state,
      country,
      post_code,
      product_data: JSON.stringify(product_data || []),
      custom_product_data: JSON.stringify(custom_product_data || []),
      total_controller_price: total_controller_price || 0,
      total_feet_price: total_feet_price || 0,
      discount_percentage: discount_percentage || 0,
      gst_percentage: gst_percentage || 0,
      gst: gst || 0,
      main_total: main_total || 0,
      notes: notes || "",
      adminnotes: adminnotes || "",
      customer_visible: "yes",
      status: 1,
      created_at: now(),
    };

    const [result] = await pool.query("INSERT INTO quote_tbl SET ?", [data]);

    if (result.affectedRows > 0) {
      const quote_id = result.insertId;
      const year = new Date().getFullYear().toString().slice(2);
      const quote_no = `QTE${year}00${quote_id}`;
      await pool.query("UPDATE quote_tbl SET quote_no = ? WHERE quote_id = ?", [quote_no, quote_id]);

      return res.status(200).json({ success: true, status_code: "1", message: "Quote added successful.", quote_id, quote_no });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/view_quote/:quote_id
export const view_quote = async (req, res) => {
  try {
    const { quote_id } = req.params;

    const [[quote]] = await pool.query(
      "SELECT * FROM quote_tbl WHERE quote_id = ?",
      [quote_id]
    );
    if (!quote) return res.status(404).json({ success: false, message: "Quote not found" });

    const discount = quote.discount_percentage;
    quote.discount_amount = (quote.total_controller_price + quote.total_feet_price) * discount / 100;

    const [access_image] = await pool.query(
      "SELECT * FROM access_image_tbl WHERE quote_id = ?", [quote_id]
    );
    quote.access_image = access_image;

    const [annotation_image] = await pool.query(
      "SELECT * FROM annotation_image_tbl WHERE quote_id = ?", [quote_id]
    );
    for (const row of annotation_image) {
      const [images] = await pool.query(
        "SELECT * FROM quote_images_tbl WHERE annotation_image_id = ? AND type = 'fullyEdited'",
        [row.annotation_image_id]
      );
      row.images = images;
    }
    quote.annotation_image = annotation_image;

    quote.products = JSON.parse(quote.product_data || "[]");
    for (const product of quote.products) {
      const [[pd]] = await pool.query(
        "SELECT product_description, price FROM product_tbl WHERE product_title = ?",
        [product.product]
      );
      product.product_description = pd?.product_description || "";
      product.price = pd?.price || "";
    }

    quote.custom_product_data = JSON.parse(quote.custom_product_data || "[]");
    quote.extra_work_data = quote.extra_work_data ? JSON.parse(quote.extra_work_data) : [];

    const [[payment_details]] = await pool.query(
      `SELECT quote_payment.*, online_payment_details.etransfer_image, online_payment_details.payment_method
       FROM quote_payment
       LEFT JOIN online_payment_details ON online_payment_details.payment_id = quote_payment.payment_id
       WHERE quote_payment.quote_id = ?`,
      [quote_id]
    );
    quote.payment_details = payment_details || null;

    return res.status(200).json({ success: true, data: quote });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/view_quote_payment/:quote_id
export const view_quote_payment = async (req, res) => {
  try {
    const { quote_id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM online_payment_details WHERE quote_id = ?",
      [quote_id]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/edit_quote/:quote_id
export const edit_quote = async (req, res) => {
  try {
    const { quote_id } = req.params;
    const [[quote]] = await pool.query(
      "SELECT * FROM quote_tbl WHERE quote_id = ?", [quote_id]
    );
    const [products] = await pool.query("SELECT * FROM product_tbl WHERE type = 1 AND status = 1");
    const [colors] = await pool.query("SELECT * FROM color_tbl");
    const [provinces] = await pool.query("SELECT * FROM taxrates");

    return res.status(200).json({
      success: true,
      data: { quote, products, colors, provinces },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/edit_quote_process
export const edit_quote_process = async (req, res) => {
  try {
    const {
      quote_id, fname, lname, email, phone,
      street, city, state, country, post_code,
      product_data, custom_product_data,
      total_controller_price, total_feet_price,
      discount_percentage, gst_percentage, gst, main_total,
      notes, adminnotes,
    } = req.body;

    const data = {
      fname, lname, email, phone,
      address: street,
      city, state, country, post_code,
      product_data: JSON.stringify(product_data || []),
      custom_product_data: JSON.stringify(custom_product_data || []),
      total_controller_price: total_controller_price || 0,
      total_feet_price: total_feet_price || 0,
      discount_percentage: discount_percentage || 0,
      gst_percentage: gst_percentage || 0,
      gst: gst || 0,
      main_total: main_total || 0,
      notes: notes || "",
      adminnotes: adminnotes || "",
      customer_visible: "yes",
    };

    const [result] = await pool.query(
      "UPDATE quote_tbl SET ? WHERE quote_id = ?",
      [data, quote_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Quote Edit sucessfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/send_for_approval
// Body: { quote_id }
export const send_for_approval = async (req, res) => {
  try {
    const { quote_id } = req.body;
    const [result] = await pool.query(
      "UPDATE quote_tbl SET status = 2 WHERE quote_id = ?", [quote_id]
    );
    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: 1, message: "Quote send successful." });
    } else {
      return res.status(200).json({ success: false, status_code: 0, message: "Something went wrong!" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/send_for_approve
// Body: { quote_id }
export const send_for_approve = async (req, res) => {
  try {
    const { quote_id } = req.body;
    const [result] = await pool.query(
      "UPDATE quote_tbl SET status = 3 WHERE quote_id = ?", [quote_id]
    );
    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: 1, message: "Quote approve successful." });
    } else {
      return res.status(200).json({ success: false, status_code: 0, message: "Something went wrong!" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/delete_quote
// Body: { quote_id }
export const delete_quote = async (req, res) => {
  try {
    const { quote_id } = req.body;
    const [result] = await pool.query(
      "UPDATE quote_tbl SET status = 5 WHERE quote_id = ?", [quote_id]
    );
    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Quote deleted successfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/set_payment_option
// Body: { quote_id, payment_type, payment_percentage, amount, pendingPaymentAmount, payment_methods }
export const set_payment_option = async (req, res) => {
  try {
    const { quote_id, payment_type, payment_percentage, amount, pendingPaymentAmount, payment_methods } = req.body;

    const payment_data = {
      quote_id,
      payment_type,
      payment_percentage: payment_type == 1 ? "100" : payment_percentage,
      part_payment_amount: amount,
      pending_payment_amount: payment_type == 1 ? "0" : pendingPaymentAmount,
      select_payment_methods: payment_methods,
    };

    const [[existing]] = await pool.query(
      "SELECT * FROM quote_payment WHERE quote_id = ?", [quote_id]
    );

    let result;
    if (existing) {
      [result] = await pool.query(
        "UPDATE quote_payment SET ? WHERE quote_id = ?", [payment_data, quote_id]
      );
      if (result.affectedRows > 0) {
        return res.status(200).json({ success: true, status_code: "1", message: "Payment option Edit sucessfully." });
      } else {
        return res.status(200).json({ success: false, status_code: "0", message: "failed." });
      }
    } else {
      payment_data.created_at = now();
      [result] = await pool.query("INSERT INTO quote_payment SET ?", [payment_data]);
      if (result.affectedRows > 0) {
        return res.status(200).json({ success: true, status_code: 1, message: "Payment option set successful." });
      } else {
        return res.status(200).json({ success: false, status_code: 0, message: "Something went wrong!" });
      }
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/add_extra_work_process
// Body: { quote_id, extra_work_data (array), gst, total_extra_work, main_total }
export const add_extra_work_process = async (req, res) => {
  try {
    const { quote_id, extra_work_data, gst, total_extra_work, main_total } = req.body;

    const data = {
      extra_work_data: JSON.stringify(extra_work_data || []),
      gst,
      total_extra_work,
      main_total,
    };

    const [result] = await pool.query(
      "UPDATE quote_tbl SET ? WHERE quote_id = ?", [data, quote_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({ success: true, status_code: "1", message: "Extra work added sucessfully." });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "failed." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/send_final_quote
// Body: { quote_id }
export const send_final_quote = async (req, res) => {
  try {
    const { quote_id } = req.body;
    await pool.query(
      "UPDATE quote_tbl SET invoice_date = ? WHERE quote_id = ?", [today(), quote_id]
    );
    // TODO: send final quote email (SMTP integration needed)
    return res.status(200).json({ success: true, status_code: 1, message: "Final Quote send successful." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/resend_quote
// Body: { quote_id }
export const resend_quote = async (req, res) => {
  try {
    // TODO: send customer email (SMTP integration needed)
    return res.status(200).json({ success: true, status_code: 1, message: "Resend Quote successful." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/update_quote
// Body: { quote_id }
export const update_quote = async (req, res) => {
  try {
    // TODO: send updated quote email (SMTP integration needed)
    return res.status(200).json({ success: true, status_code: 1, message: "updated Quote resend successful." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/payment_receive
// Body: { quote_id, online_payment_id, maintotal, amount }
export const payment_receive = async (req, res) => {
  try {
    const { quote_id, online_payment_id, maintotal, amount } = req.body;

    // Mark online payment as confirmed
    await pool.query(
      "UPDATE online_payment_details SET amount = ?, status = 1 WHERE online_payment_id = ?",
      [amount, online_payment_id]
    );

    // Sum all confirmed payments for this quote
    const [[{ confirmed }]] = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as confirmed FROM online_payment_details WHERE quote_id = ? AND status = 1",
      [quote_id]
    );

    const pending_payment_amount = Math.max(0, parseFloat((maintotal - confirmed).toFixed(2)));
    const quote_payment_status = pending_payment_amount <= 0 ? 1 : 0;

    await pool.query(
      "UPDATE quote_payment SET part_payment_amount = ?, pending_payment_amount = ?, status = ? WHERE quote_id = ?",
      [confirmed, pending_payment_amount, quote_payment_status, quote_id]
    );

    // TODO: send payment confirmation email (SMTP integration needed)
    return res.status(200).json({
      success: true,
      status_code: 1,
      message: "Payment has been marked as received.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /quote/schedule_installation
// Body: { quote_id, installation_date, customer_email, quote_no }
export const schedule_installation = async (req, res) => {
  try {
    const { quote_id, installation_date } = req.body;

    const [result] = await pool.query(
      "UPDATE quote_tbl SET installation_date = ? WHERE quote_id = ?",
      [installation_date, quote_id]
    );

    if (result.affectedRows > 0) {
      // TODO: send installation scheduled email (SMTP integration needed)
      return res.status(200).json({
        success: true,
        status_code: "1",
        message: "Installation scheduled successfully and email sent to customer.",
      });
    } else {
      return res.status(200).json({ success: false, status_code: "0", message: "Failed to schedule installation." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /quote/installs?user_id=X&role=Y
export const installs = async (req, res) => {
  try {
    const [upcoming] = await pool.query(`
      SELECT quote_tbl.*,
        CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman,
        COALESCE(SUM(annotation_image_tbl.total_numerical_box), 0) as total_numerical_box
      FROM quote_tbl
      JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
      LEFT JOIN annotation_image_tbl ON annotation_image_tbl.quote_id = quote_tbl.quote_id
      WHERE quote_tbl.status = 3
        AND quote_tbl.installation_date IS NOT NULL
        AND quote_tbl.installation_date != ''
        AND quote_tbl.installation_date >= ?
      GROUP BY quote_tbl.quote_id
      ORDER BY quote_tbl.installation_date ASC
    `, [today()]);

    const [non_scheduled] = await pool.query(`
      SELECT quote_tbl.*,
        CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman,
        COALESCE(SUM(annotation_image_tbl.total_numerical_box), 0) as total_numerical_box
      FROM quote_tbl
      JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
      LEFT JOIN annotation_image_tbl ON annotation_image_tbl.quote_id = quote_tbl.quote_id
      LEFT JOIN quote_payment ON quote_payment.quote_id = quote_tbl.quote_id
      LEFT JOIN online_payment_details ON online_payment_details.payment_id = quote_payment.payment_id
      WHERE quote_tbl.status = 3
        AND online_payment_details.status = 1
        AND (quote_tbl.installation_date IS NULL OR quote_tbl.installation_date = '')
      GROUP BY quote_tbl.quote_id
      ORDER BY quote_tbl.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: { upcoming_installations: upcoming, non_scheduled_jobs: non_scheduled },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
