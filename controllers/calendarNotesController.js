import pool from "../db.js";

// GET /calendar/notes?month=&year=&user_id=&role=
export const getNotes = async (req, res) => {
  try {
    const { month, year, user_id, role } = req.query;

    let query = `
      SELECT 
        cn.note_id,
        DATE_FORMAT(cn.date, '%Y-%m-%d') AS date,
        cn.title,
        cn.description,
        cn.color,
        cn.created_by,
        cn.created_at,
        cn.updated_at,
        CONCAT(u.fname, ' ', u.lname) AS creator_name
      FROM calendar_notes_tbl cn
      LEFT JOIN user_tbl u ON u.user_id = cn.created_by
      WHERE 1=1
    `;
    const params = [];

    if (year && month) {
      query += ` AND YEAR(cn.date) = ? AND MONTH(cn.date) = ?`;
      params.push(year, month);
    } else if (year) {
      query += ` AND YEAR(cn.date) = ?`;
      params.push(year);
    }

    // Role-based filtering if needed:
    // Admin (role 1) sees everything. If installer/sales should see their own:
    if (role && Number(role) !== 1 && user_id) {
      query += ` AND cn.created_by = ?`;
      params.push(user_id);
    }

    query += ` ORDER BY cn.date ASC, cn.created_at ASC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("getNotes error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /calendar/notes
// Body: { date, title, description, color, created_by }
export const createNote = async (req, res) => {
  try {
    const { date, title, description, color, created_by } = req.body;

    if (!date || !title) {
      return res.status(400).json({
        success: false,
        message: "Date and title are required.",
      });
    }

    // Standardize date to YYYY-MM-DD
    let cleanDate = date;
    if (cleanDate.includes("T")) cleanDate = cleanDate.split("T")[0];
    if (cleanDate.includes(" ")) cleanDate = cleanDate.split(" ")[0];

    const noteColor = color || "blue";

    const [result] = await pool.query(
      `INSERT INTO calendar_notes_tbl (date, title, description, color, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanDate, title.trim(), description ? description.trim() : null, noteColor, created_by || 1]
    );

    return res.status(201).json({
      success: true,
      message: "Note created successfully.",
      data: {
        note_id: result.insertId,
        date: cleanDate,
        title: title.trim(),
        description: description ? description.trim() : null,
        color: noteColor,
        created_by: created_by || 1,
      },
    });
  } catch (error) {
    console.error("createNote error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /calendar/notes/:note_id
// Body: { title, description, color, date }
export const updateNote = async (req, res) => {
  try {
    const { note_id } = req.params;
    const { title, description, color, date } = req.body;

    if (!note_id) {
      return res.status(400).json({ success: false, message: "note_id is required." });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title.trim());
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description ? description.trim() : null);
    }
    if (color !== undefined) {
      updates.push("color = ?");
      params.push(color);
    }
    if (date !== undefined) {
      let cleanDate = date;
      if (cleanDate.includes("T")) cleanDate = cleanDate.split("T")[0];
      if (cleanDate.includes(" ")) cleanDate = cleanDate.split(" ")[0];
      updates.push("date = ?");
      params.push(cleanDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update." });
    }

    params.push(note_id);
    const [result] = await pool.query(
      `UPDATE calendar_notes_tbl SET ${updates.join(", ")}, updated_at = NOW() WHERE note_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully.",
    });
  } catch (error) {
    console.error("updateNote error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /calendar/notes/:note_id
export const deleteNote = async (req, res) => {
  try {
    const { note_id } = req.params;

    if (!note_id) {
      return res.status(400).json({ success: false, message: "note_id is required." });
    }

    const [result] = await pool.query(
      `DELETE FROM calendar_notes_tbl WHERE note_id = ?`,
      [note_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully.",
    });
  } catch (error) {
    console.error("deleteNote error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

