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
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage }).single("etransfer_screenshot");

import {
  manage_invoice,
  processPayment,
  processPaymentfinal,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/manage_invoice", manage_invoice);
router.post("/processPayment", upload, processPayment);
router.post("/processPaymentfinal", upload, processPaymentfinal);

export default router;
