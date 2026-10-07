import pool from "../db.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// ─── PUBLIC ─────────────────────────────────────────────────────────────────

// POST /lead/public/submit
export const submitLead = async (req, res) => {
  try {
    let { name, phone, note, address } = req.body;

    name = (name || "").trim();
    phone = (phone || "").trim();
    note = (note || "").trim();
    address = (address || "").trim();

    if (name.length > 255) name = name.substring(0, 255);
    if (phone.length > 50) phone = phone.substring(0, 50);
    if (note.length > 2000) note = note.substring(0, 2000);
    if (address.length > 2000) address = address.substring(0, 2000);

    if (!name && !phone && !note && !address) {
      return res.status(400).json({
        success: false,
        message: "Please enter at least one detail.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO lead_tbl (name, phone, note, address, status, created_at)
       VALUES (?, ?, ?, ?, 'New', ?)`,
      [name || null, phone || null, note || null, address || null, now()]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: "Your enquiry has been submitted successfully.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to submit enquiry. Please try again.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── AUTHENTICATED (admin / sales) ──────────────────────────────────────────

// GET /lead/manage
export const manageLeads = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM lead_tbl WHERE active_state = 1 ORDER BY lead_id DESC"
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /lead/view/:id
export const viewLead = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM lead_tbl WHERE lead_id = ? AND active_state = 1",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /lead/update_status
// Body: { lead_id, status }
export const updateLeadStatus = async (req, res) => {
  try {
    const { lead_id, status } = req.body;

    const validStatuses = ["New", "Contacted", "Converted", "Closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const [result] = await pool.query(
      `UPDATE lead_tbl
       SET status = ?, updated_at = ?
       WHERE lead_id = ? AND active_state = 1`,
      [status, now(), lead_id]
    );

    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: "Lead status updated successfully.",
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Lead not found or no changes made.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /lead/delete
// Body: { lead_id }
export const deleteLead = async (req, res) => {
  try {
    const { lead_id } = req.body;
    const [result] = await pool.query(
      "UPDATE lead_tbl SET active_state = 0, updated_at = ? WHERE lead_id = ?",
      [now(), lead_id]
    );
    if (result.affectedRows > 0) {
      return res.status(200).json({
        success: true,
        message: "Lead deleted successfully.",
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Failed to delete lead.",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
