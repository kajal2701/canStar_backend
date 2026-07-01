import express from "express";
import {
  getSalesByMonth,
  getSalesByPerson,
  getColorUsage,
} from "../controllers/reportController.js";

const router = express.Router();

// GET /report/sales-by-month → Monthly revenue & quote count  (?year=2025)
router.get("/sales-by-month", getSalesByMonth);

// GET /report/sales-by-person → Revenue by salesperson (?year=2025&month=08)
router.get("/sales-by-person", getSalesByPerson);

// GET /report/color-usage → Colour usage stats (?year=2025&month=08)
router.get("/color-usage", getColorUsage);

export default router;
