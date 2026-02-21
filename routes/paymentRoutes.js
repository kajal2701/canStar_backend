import express from "express";
import { manage_invoice } from "../controllers/paymentController.js";

const router = express.Router();

router.get("/manage_invoice", manage_invoice);

export default router;
