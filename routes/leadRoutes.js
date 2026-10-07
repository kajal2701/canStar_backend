import express from "express";
import {
  submitLead,
  manageLeads,
  viewLead,
  updateLeadStatus,
  deleteLead,
} from "../controllers/leadController.js";

const router = express.Router();

router.post("/public/submit", submitLead);
router.get("/manage", manageLeads);
router.get("/view/:id", viewLead);
router.post("/update_status", updateLeadStatus);
router.post("/delete", deleteLead);

export default router;
