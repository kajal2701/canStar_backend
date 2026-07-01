import pool from "../db.js";

// GET /report/sales-by-month
// Returns monthly revenue + quote count, optionally filtered by year
export const getSalesByMonth = async (req, res) => {
  try {
    const { year } = req.query;
    const params = [];
    let yearFilter = "";

    if (year) {
      yearFilter = "AND YEAR(created_at) = ?";
      params.push(year);
    }

    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') as month,
         DATE_FORMAT(created_at, '%b %Y') as month_label,
         COUNT(*) as total_quotes,
         COALESCE(SUM(main_total), 0) as total_revenue,
         COALESCE(AVG(main_total), 0) as avg_deal_size
       FROM quote_tbl
       WHERE status != 5 ${yearFilter}
       GROUP BY month, month_label
       ORDER BY month ASC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        total_revenue: parseFloat(r.total_revenue),
        avg_deal_size: parseFloat(r.avg_deal_size),
        total_quotes: parseInt(r.total_quotes),
      })),
    });
  } catch (error) {

    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /report/sales-by-person
// Returns revenue, quote count, avg deal, max deal grouped by salesperson, optionally filtered by year/month
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
         CONCAT(u.fname, ' ', u.lname) as salesperson,
         COUNT(*) as total_quotes,
         COALESCE(SUM(q.main_total), 0) as total_revenue,
         COALESCE(AVG(q.main_total), 0) as avg_deal_size,
         COALESCE(MAX(q.main_total), 0) as max_deal
       FROM quote_tbl q
       JOIN user_tbl u ON u.user_id = q.user_id
       ${whereClause}
       GROUP BY u.user_id, salesperson
       ORDER BY total_revenue DESC`,
      params
    );

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        total_revenue: parseFloat(r.total_revenue),
        avg_deal_size: parseFloat(r.avg_deal_size),
        max_deal: parseFloat(r.max_deal),
        total_quotes: parseInt(r.total_quotes),
      })),
    });
  } catch (error) {

    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /report/color-usage
// Returns colour usage statistics from annotations, optionally filtered by year/month
export const getColorUsage = async (req, res) => {
  try {
    const { year, month } = req.query;
    const params = [];
    const conditions = [
      "q.status != 5",
      "a.color IS NOT NULL",
      "a.color != ''"
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
         COALESCE(SUM(a.total_numerical_box), 0) as total_boxes,
         COALESCE(SUM(a.total_amount), 0) as total_revenue
       FROM annotation_image_tbl a
       JOIN quote_tbl q ON q.quote_id = a.quote_id
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
        total_revenue: parseFloat(r.total_revenue),
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
