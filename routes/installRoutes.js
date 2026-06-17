import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `install_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage });

import {
  saveInstallStep,
  getInstallProcess,
  completeInstallProcess,
  sendOnTheWayNotification,
  sendControllerBoxEmail,
  sendPreAssessment,
} from "../controllers/installController.js";

const router = express.Router();

// POST /install/save-step — Save a single step's data (supports file uploads)
router.post("/save-step", upload.any(), saveInstallStep);

// GET /install/process/:quote_id — Get saved process state
router.get("/process/:quote_id", getInstallProcess);

// POST /install/complete — Mark installation as complete
router.post("/complete", completeInstallProcess);


// POST /install/:quote_id/on-the-way — Send on-the-way email notification
router.post("/:quote_id/on-the-way", sendOnTheWayNotification);

// POST /install/:quote_id/controller-box-email — Send controller box confirmation
router.post("/:quote_id/controller-box-email", sendControllerBoxEmail);

// POST /install/:quote_id/pre-assessment-email — Send pre-assessment to customer
router.post("/:quote_id/pre-assessment-email", sendPreAssessment);

export default router;
