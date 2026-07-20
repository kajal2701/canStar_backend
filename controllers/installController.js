import pool from "../db.js";
import { sendOnTheWayEmail, sendControllerBoxConfirmation, sendPreAssessmentEmail, sendInstallationCompleteEmail } from "../utils/emailHelper.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// Map step number → DB column name
const STEP_COLUMN_MAP = {
  1: "prep_data",
  2: "on_the_way_data",
  3: "controller_box_data",
  4: "post_install_data",
  5: "drop_off_data",
  6: "time_entry_data",
};

// ─── POST /install/save-step ─────────────────────────────────────────────────
// Saves a single step's data (upsert: insert if new, update if exists)
// Supports both JSON body and multipart form data (for steps with images)
// Body/FormData: { quote_id, installer_id, current_step, step_data }
// Files: controller_box_photo, assessment_image_0, assessment_image_1, ...
export const saveInstallStep = async (req, res) => {
  try {
    const quote_id = req.body.quote_id;
    const installer_id = req.body.installer_id;
    const current_step = req.body.current_step;

    // step_data may arrive as a JSON string (multipart) or object (JSON body)
    let step_data = req.body.step_data;
    if (typeof step_data === "string") {
      step_data = JSON.parse(step_data);
    }
    step_data = step_data || {};

    if (!quote_id) {
      return res.status(400).json({ success: false, message: "quote_id is required." });
    }

    const stepNum = parseInt(current_step);
    if (!stepNum || stepNum < 1 || stepNum > 7) {
      return res.status(400).json({ success: false, message: "current_step must be between 1 and 7." });
    }

    const columnName = STEP_COLUMN_MAP[stepNum];
    if (!columnName) {
      return res.status(400).json({ success: false, message: "Step 7 uses the /install/complete endpoint." });
    }

    // Handle file uploads for step 3 (controller box)
    const files = req.files || [];
    if (stepNum === 3 && files.length > 0) {
      // Controller box photo
      const cbPhoto = files.find((f) => f.fieldname === "controller_box_photo");
      if (cbPhoto) {
        step_data.photo = {
          name: cbPhoto.originalname,
          filePath: `uploads/${cbPhoto.filename}`,
        };
      }

      // Assessment images
      const assessmentFiles = files
        .filter((f) => f.fieldname.startsWith("assessment_image_"))
        .sort((a, b) => {
          const idxA = parseInt(a.fieldname.split("_").pop());
          const idxB = parseInt(b.fieldname.split("_").pop());
          return idxA - idxB;
        });

      if (assessmentFiles.length > 0) {
        // Keep existing uploaded images (those without pending file) and add new ones
        const existingUploaded = (step_data.preAssessmentImages || [])
          .filter((img) => img.filePath && !img.pending);
        const newUploaded = assessmentFiles.map((f) => ({
          name: f.originalname,
          filePath: `uploads/${f.filename}`,
        }));
        step_data.preAssessmentImages = [...existingUploaded, ...newUploaded];
      }
    }

    const stepDataJson = JSON.stringify(step_data);

    // Check if a record already exists for this quote
    const [[existing]] = await pool.query(
      "SELECT install_process_id FROM install_process_tbl WHERE quote_id = ?",
      [quote_id]
    );

    if (existing) {
      await pool.query(
        `UPDATE install_process_tbl 
         SET ${columnName} = ?, current_step = ?, installer_id = ?, updated_at = ?
         WHERE quote_id = ?`,
        [stepDataJson, stepNum, installer_id || null, now(), quote_id]
      );
    } else {
      await pool.query(
        `INSERT INTO install_process_tbl 
         (quote_id, installer_id, current_step, ${columnName}, status, started_at, updated_at)
         VALUES (?, ?, ?, ?, 'in_progress', ?, ?)`,
        [quote_id, installer_id || null, stepNum, stepDataJson, now(), now()]
      );
    }

    return res.status(200).json({
      success: true,
      message: `Step ${stepNum} saved successfully.`,
      step_data, // return the updated step_data with file paths
    });
  } catch (error) {
    console.error("saveInstallStep error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /install/process/:quote_id ──────────────────────────────────────────
// Returns the full saved process state for a given quote
export const getInstallProcess = async (req, res) => {
  try {
    const { quote_id } = req.params;

    const [[record]] = await pool.query(
      "SELECT * FROM install_process_tbl WHERE quote_id = ?",
      [quote_id]
    );

    if (!record) {
      return res.status(200).json({ success: true, data: null });
    }

    // Parse JSON columns (mysql2 may return them as strings or objects)
    const parseJson = (val) => {
      if (!val) return null;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return null; }
      }
      return val;
    };

    const data = {
      install_process_id: record.install_process_id,
      quote_id: record.quote_id,
      installer_id: record.installer_id,
      current_step: record.current_step,
      prep_data: parseJson(record.prep_data),
      on_the_way_data: parseJson(record.on_the_way_data),
      controller_box_data: parseJson(record.controller_box_data),
      post_install_data: parseJson(record.post_install_data),
      drop_off_data: parseJson(record.drop_off_data),
      time_entry_data: parseJson(record.time_entry_data),
      status: record.status,
      started_at: record.started_at,
      completed_at: record.completed_at,
      updated_at: record.updated_at,
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getInstallProcess error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /install/complete ──────────────────────────────────────────────────
// Marks the installation process as completed
// Body: { quote_id }
export const completeInstallProcess = async (req, res) => {
  try {
    const { quote_id } = req.body;

    if (!quote_id) {
      return res.status(400).json({ success: false, message: "quote_id is required." });
    }

    const [[existing]] = await pool.query(
      "SELECT install_process_id, status FROM install_process_tbl WHERE quote_id = ?",
      [quote_id]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: "No install process found for this quote." });
    }

    if (existing.status === "completed") {
      return res.status(200).json({ success: true, message: "Installation already completed." });
    }

    await pool.query(
      `UPDATE install_process_tbl 
       SET status = 'completed', current_step = 7, completed_at = ?, updated_at = ?
       WHERE quote_id = ?`,
      [now(), now(), quote_id]
    );

    // Send completion email to admin + salesman
    try {
      await sendInstallationCompleteEmail(parseInt(quote_id));
    } catch (emailErr) {
      console.error("Completion email failed (non-blocking):", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Installation marked as complete.",
    });
  } catch (error) {
    console.error("completeInstallProcess error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /install/:quote_id/on-the-way ──────────────────────────────────────
// Sends an "On the Way" email notification to customer + quote person
// Body: { etaMinutes }
export const sendOnTheWayNotification = async (req, res) => {
  try {
    const { quote_id } = req.params;
    const { etaMinutes } = req.body;

    if (!quote_id || !etaMinutes) {
      return res.status(400).json({ success: false, message: "quote_id and etaMinutes are required." });
    }

    await sendOnTheWayEmail(parseInt(quote_id), etaMinutes);

    return res.status(200).json({
      success: true,
      message: "On the Way notification sent successfully.",
    });
  } catch (error) {
    console.error("sendOnTheWayNotification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /install/:quote_id/controller-box-email ────────────────────────────
// Sends controller box location photo to customer for confirmation
// Body: { photo } (base64 data URI)
export const sendControllerBoxEmail = async (req, res) => {
  try {
    const { quote_id } = req.params;
    const { photo } = req.body;

    if (!quote_id || !photo) {
      return res.status(400).json({ success: false, message: "quote_id and photo are required." });
    }

    await sendControllerBoxConfirmation(parseInt(quote_id), photo);

    return res.status(200).json({
      success: true,
      message: "Controller box confirmation email sent successfully.",
    });
  } catch (error) {
    console.error("sendControllerBoxEmail error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /install/:quote_id/pre-assessment-email ────────────────────────────
// Sends pre-installation assessment to customer
// Body: { images (array of base64), notes (string) }
export const sendPreAssessment = async (req, res) => {
  try {
    const { quote_id } = req.params;
    const { images, notes } = req.body;

    if (!quote_id) {
      return res.status(400).json({ success: false, message: "quote_id is required." });
    }

    await sendPreAssessmentEmail(parseInt(quote_id), images || [], notes || "");

    return res.status(200).json({
      success: true,
      message: "Pre-installation assessment email sent successfully.",
    });
  } catch (error) {
    console.error("sendPreAssessment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
