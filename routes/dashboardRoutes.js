import express from "express";
import { get_dashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", get_dashboard);

export default router;
