import express from "express";
import {
  manage_customer,
  add_customer_process,
  get_customer_by_id,
  update_customer_process,
  delete_customer,
} from "../controllers/customerController.js";

const router = express.Router();

router.get("/manage_customer", manage_customer);
router.post("/add_customer_process", add_customer_process);
router.get("/edit_customer/:customer_id", get_customer_by_id);
router.post("/update_customer_process", update_customer_process);
router.post("/delete_customer", delete_customer);

export default router;
