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
      notes, adminnotes, annotation_data,
    } = req.body;

    // product_data / custom_product_data may arrive as JSON strings (multipart) or arrays (JSON body)
    const parseField = (val) => {
      if (!val) return [];
      if (typeof val === "string") return JSON.parse(val);
      return val;
    };

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
      product_data: JSON.stringify(parseField(product_data)),
      custom_product_data: JSON.stringify(parseField(custom_product_data)),
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

      // Insert annotation rows + uploaded images (mirrors insert_annotation_data_new)
      const annotations = parseField(annotation_data);
      const files = req.files || [];

      for (let i = 0; i < annotations.length; i++) {
        const ann = annotations[i];
        const index = i + 1; // 1-based to match PHP field naming

        const ann_row = {
          quote_id,
          identify_image_name: ann.identify_image_name || "",
          sft_count: ann.sft_count || 0,
          divide: ann.divide || 0,
          total_numerical_box: ann.total_numerical_box || 0,
          unit_price: ann.unit_price || 0,
          total_amount: ann.total_amount || 0,
          no_peaks: ann.no_peaks || 0,
          no_jumper: ann.no_jumper || 0,
          color: ann.color || "",
          required: ann.required || "",
          created_at: now(),
        };

        const [ann_result] = await pool.query("INSERT INTO annotation_image_tbl SET ?", [ann_row]);
        const annotation_image_id = ann_result.insertId;

        // Match uploaded files for this annotation index
        // preview-image_N_*  → drawnLines
        // preview-image-edit_N_* → fullyEdited
        const image_batch = files
          .filter((f) =>
            f.fieldname.startsWith(`preview-image-edit_${index}_`) ||
            f.fieldname.startsWith(`preview-image_${index}_`)
          )
          .map((f) => [
            quote_id,
            annotation_image_id,
            `uploads/${f.filename}`,
            f.fieldname.startsWith(`preview-image-edit_${index}_`) ? "fullyEdited" : "drawnLines",
            now(),
          ]);

        if (image_batch.length > 0) {
          await pool.query(
            "INSERT INTO quote_images_tbl (quote_id, annotation_image_id, image_url, type, created_at) VALUES ?",
            [image_batch]
          );
        }
      }

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
    if (!quote) return res.status(404).json({ success: false, message: "Quote not found" });

    // Access images (plug and controller)
    const [[access_image_plug]] = await pool.query(
      "SELECT * FROM access_image_tbl WHERE quote_id = ? AND access_type = 'plug'", [quote_id]
    );
    if (access_image_plug && access_image_plug.data_type == 1 && typeof access_image_plug.data === "string") {
      try { access_image_plug.data = JSON.parse(access_image_plug.data); } catch (e) {}
    }
    quote.access_image_plug = access_image_plug || null;

    const [[access_image_controller]] = await pool.query(
      "SELECT * FROM access_image_tbl WHERE quote_id = ? AND access_type = 'controller'", [quote_id]
    );
    if (access_image_controller && access_image_controller.data_type == 1 && typeof access_image_controller.data === "string") {
      try { access_image_controller.data = JSON.parse(access_image_controller.data); } catch (e) {}
    }
    quote.access_image_controller = access_image_controller || null;

    // Annotation images with nested images
    const [annotation_image] = await pool.query(
      "SELECT * FROM annotation_image_tbl WHERE quote_id = ?", [quote_id]
    );
    for (const row of annotation_image) {
      const [images] = await pool.query(
        "SELECT * FROM quote_images_tbl WHERE annotation_image_id = ?",
        [row.annotation_image_id]
      );
      row.images = images;
    }
    quote.annotation_image = annotation_image;

    // Enrich products with product_description and price
    quote.products = JSON.parse(quote.product_data || "[]");
    for (let i = 0; i < quote.products.length; i++) {
      const [[pd]] = await pool.query(
        "SELECT product_description, price FROM product_tbl WHERE product_title = ?",
        [quote.products[i].product]
      );
      quote.products[i].product_description = pd?.product_description || "";
      quote.products[i].price = pd?.price || "";
    }

    quote.custom_product_data = JSON.parse(quote.custom_product_data || "[]");

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
      notes, adminnotes, annotation_data,
    } = req.body;

    const parseField = (val) => {
      if (!val) return [];
      if (typeof val === "string") return JSON.parse(val);
      return val;
    };

    // Capture old main_total before updating (for payment recalculation)
    const [[old_quote]] = await pool.query(
      "SELECT main_total FROM quote_tbl WHERE quote_id = ?", [quote_id]
    );
    const old_main_total = parseFloat(old_quote?.main_total || 0);

    const data = {
      fname, lname, email, phone,
      address: street,
      city, state, country, post_code,
      product_data: JSON.stringify(parseField(product_data)),
      custom_product_data: JSON.stringify(parseField(custom_product_data)),
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

    // Recalculate pending payment if main_total changed
    const new_main_total = parseFloat(main_total || 0);
    if (old_main_total !== new_main_total) {
      const [[payment_record]] = await pool.query(
        "SELECT * FROM quote_payment WHERE quote_id = ?", [quote_id]
      );
      if (payment_record) {
        const [[confirmed_row]] = await pool.query(
          "SELECT COALESCE(SUM(amount), 0) as total FROM online_payment_details WHERE quote_id = ? AND status = 1",
          [quote_id]
        );
        let confirmed = parseFloat(confirmed_row?.total || 0);
        if (!confirmed) {
          confirmed = parseFloat(payment_record.part_payment_amount || 0);
        }
        let new_pending = parseFloat((new_main_total - confirmed).toFixed(2));
        if (new_pending < 0) new_pending = 0;
        const payment_status = new_pending <= 0 ? 1 : 0;
        await pool.query(
          "UPDATE quote_payment SET pending_payment_amount = ?, status = ? WHERE quote_id = ?",
          [new_pending, payment_status, quote_id]
        );
      }
    }

    // Edit annotation data (mirrors PHP edit_annotation_data_new__)
    const annotations = parseField(annotation_data);
    const files = req.files || [];

    // Get existing annotation IDs for this quote
    const [existing_annotations] = await pool.query(
      "SELECT annotation_image_id FROM annotation_image_tbl WHERE quote_id = ?", [quote_id]
    );
    const existing_annotation_ids = existing_annotations.map((r) => r.annotation_image_id);
    const processed_annotation_ids = [];
    const image_data_batch = [];

    for (let i = 0; i < annotations.length; i++) {
      const ann = annotations[i];
      const index = i + 1; // 1-based to match file field naming

      const ann_row = {
        quote_id,
        identify_image_name: ann.identify_image_name || "",
        sft_count: ann.sft_count || 0,
        divide: ann.divide || 0,
        total_numerical_box: ann.total_numerical_box || 0,
        unit_price: ann.unit_price || 0,
        total_amount: ann.total_amount || 0,
        no_peaks: ann.no_peaks || 0,
        no_jumper: ann.no_jumper || 0,
        color: ann.color || "",
        required: ann.required || "",
        created_at: now(),
      };

      let current_annotation_id;
      if (ann.annotation_image_id) {
        // UPDATE existing annotation
        await pool.query(
          "UPDATE annotation_image_tbl SET ? WHERE annotation_image_id = ?",
          [ann_row, ann.annotation_image_id]
        );
        current_annotation_id = ann.annotation_image_id;
      } else {
        // INSERT new annotation
        const [ann_result] = await pool.query("INSERT INTO annotation_image_tbl SET ?", [ann_row]);
        current_annotation_id = ann_result.insertId;
      }
      processed_annotation_ids.push(current_annotation_id);

      // Existing images to keep (passed in annotation_data as existing_images array)
      const existing_images = ann.existing_images || [];
      for (const img of existing_images) {
        image_data_batch.push([quote_id, current_annotation_id, img.image_url, img.type, now()]);
      }

      // New uploaded files for this annotation index
      const new_files = files.filter((f) =>
        f.fieldname.startsWith(`preview-image-edit_${index}_`) ||
        f.fieldname.startsWith(`preview-image_${index}_`)
      );
      for (const f of new_files) {
        image_data_batch.push([
          quote_id,
          current_annotation_id,
          `uploads/${f.filename}`,
          f.fieldname.startsWith(`preview-image-edit_${index}_`) ? "fullyEdited" : "drawnLines",
          now(),
        ]);
      }
    }

    // Delete annotations that were removed
    const deleted_ids = existing_annotation_ids.filter(
      (id) => !processed_annotation_ids.includes(id)
    );
    if (deleted_ids.length > 0) {
      await pool.query("DELETE FROM quote_images_tbl WHERE annotation_image_id IN (?)", [deleted_ids]);
      await pool.query("DELETE FROM annotation_image_tbl WHERE annotation_image_id IN (?)", [deleted_ids]);
    }

    // Replace images for processed annotations: delete old, insert new+kept
    if (image_data_batch.length > 0) {
      const updated_ann_ids = [...new Set(image_data_batch.map((r) => r[1]))];
      await pool.query("DELETE FROM quote_images_tbl WHERE annotation_image_id IN (?)", [updated_ann_ids]);
      await pool.query(
        "INSERT INTO quote_images_tbl (quote_id, annotation_image_id, image_url, type, created_at) VALUES ?",
        [image_data_batch]
      );
    }

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

// GET /quote/installs2
export const installs2 = async (req, res) => {
  try {
    const paymentDetailsQuery = `
      SELECT quote_payment.*,
        online_payment_details.etransfer_image,
        online_payment_details.payment_method,
        online_payment_details.status as payment_status
      FROM quote_payment
      LEFT JOIN online_payment_details ON online_payment_details.payment_id = quote_payment.payment_id
      WHERE quote_payment.quote_id = ?
    `;

    // Upcoming installations (future dates)
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

    for (const quote of upcoming) {
      const [payments] = await pool.query(paymentDetailsQuery, [quote.quote_id]);
      quote.payment_details = payments;
    }

    // Past installations where invoice NOT sent
    const [past_pending_invoice] = await pool.query(`
      SELECT quote_tbl.*,
        CONCAT(user_tbl.fname,' ',user_tbl.lname) as salesman,
        COALESCE(SUM(annotation_image_tbl.total_numerical_box), 0) as total_numerical_box
      FROM quote_tbl
      JOIN user_tbl ON user_tbl.user_id = quote_tbl.user_id
      LEFT JOIN annotation_image_tbl ON annotation_image_tbl.quote_id = quote_tbl.quote_id
      WHERE quote_tbl.status = 3
        AND quote_tbl.installation_date IS NOT NULL
        AND quote_tbl.installation_date != ''
        AND quote_tbl.installation_date < ?
        AND (quote_tbl.invoice_date IS NULL OR quote_tbl.invoice_date = '')
      GROUP BY quote_tbl.quote_id
      ORDER BY quote_tbl.installation_date DESC
    `, [today()]);

    for (const quote of past_pending_invoice) {
      const [payments] = await pool.query(paymentDetailsQuery, [quote.quote_id]);
      quote.payment_details = payments;
    }

    // Non-scheduled jobs (confirmed but no installation date)
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

    for (const quote of non_scheduled) {
      const [payments] = await pool.query(paymentDetailsQuery, [quote.quote_id]);
      quote.payment_details = payments;
    }

    return res.status(200).json({
      success: true,
      data: {
        upcoming_installations: upcoming,
        past_installations_pending_invoice: past_pending_invoice,
        non_scheduled_jobs: non_scheduled,
      },
    });
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
