import pool from "../db.js";

// GET /report/sales-by-month
// Returns monthly total quotes, converted (deposit confirmed) quotes, and revenue from converted quotes
export const getSalesByMonth = async (req, res) => {
  try {
    const { year } = req.query;
    const params = [];
    let yearFilter = "";

    if (year) {
      yearFilter = "AND YEAR(q.created_at) = ?";
      params.push(year);
    }

    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(q.created_at, '%Y-%m') AS month,
         DATE_FORMAT(q.created_at, '%b %Y') AS month_label,
         COUNT(DISTINCT q.quote_id) AS total_quotes,
          COUNT(DISTINCT CASE WHEN dp.quote_id IS NOT NULL THEN q.quote_id END) AS converted_quotes,
          COALESCE(SUM(DISTINCT CASE WHEN dp.quote_id IS NOT NULL THEN q.main_total ELSE 0 END), 0) AS total_revenue
        FROM quote_tbl q
        LEFT JOIN (
          SELECT DISTINCT qp.quote_id
          FROM quote_payment qp
          JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
          WHERE opd.status = 1
        ) dp ON dp.quote_id = q.quote_id
       WHERE q.status != 5 ${yearFilter}
       GROUP BY month, month_label
       ORDER BY month ASC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        total_quotes: parseInt(r.total_quotes),
        converted_quotes: parseInt(r.converted_quotes),
        total_revenue: parseFloat(r.total_revenue),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /report/sales-by-person
// Returns total quotes, converted (deposit confirmed) quotes, and revenue from converted quotes grouped by salesperson
export const getSalesByPerson = async (req, res) => {
  try {
    const { year, month } = req.query;
    const params = [];
    const conditions = ["q.status != 5"];

    if (year) {
      conditions.push("YEAR(q.created_at) = ?");
      params.push(year);
    }

    if (month) {
      conditions.push("MONTH(q.created_at) = ?");
      params.push(month);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT
         u.user_id,
         CONCAT(u.fname, ' ', u.lname) AS salesperson,
         COUNT(DISTINCT q.quote_id) AS total_quotes,
          COUNT(DISTINCT CASE WHEN dp.quote_id IS NOT NULL THEN q.quote_id END) AS converted_quotes,
          COALESCE(SUM(DISTINCT CASE WHEN dp.quote_id IS NOT NULL THEN q.main_total ELSE 0 END), 0) AS total_revenue
        FROM quote_tbl q
        JOIN user_tbl u ON u.user_id = q.user_id
        LEFT JOIN (
          SELECT DISTINCT qp.quote_id
          FROM quote_payment qp
          JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
          WHERE opd.status = 1
        ) dp ON dp.quote_id = q.quote_id
       ${whereClause}
       GROUP BY u.user_id, salesperson
       ORDER BY total_revenue DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        total_quotes: parseInt(r.total_quotes),
        converted_quotes: parseInt(r.converted_quotes),
        total_revenue: parseFloat(r.total_revenue),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /report/color-usage
// Returns colour usage statistics from annotations for deposit confirmed quotes, optionally filtered by year/month
export const getColorUsage = async (req, res) => {
  try {
    const { year, month } = req.query;
    const params = [];
    const conditions = [
      "q.status != 5",
      "a.color IS NOT NULL",
      "a.color != ''",
      "dp.quote_id IS NOT NULL"
    ];

    if (year) {
      conditions.push("YEAR(q.created_at) = ?");
      params.push(year);
    }

    if (month) {
      conditions.push("MONTH(q.created_at) = ?");
      params.push(month);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT
          a.color,
          COUNT(*) as usage_count,
          COALESCE(SUM(a.total_numerical_box), 0) as total_boxes
        FROM annotation_image_tbl a
        JOIN quote_tbl q ON q.quote_id = a.quote_id
        LEFT JOIN (
          SELECT DISTINCT qp.quote_id
          FROM quote_payment qp
          JOIN online_payment_details opd ON opd.payment_id = qp.payment_id
          WHERE opd.status = 1
        ) dp ON dp.quote_id = q.quote_id
       ${whereClause}
       GROUP BY a.color
       ORDER BY total_boxes DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        usage_count: parseInt(r.usage_count),
        total_boxes: parseFloat(r.total_boxes),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
