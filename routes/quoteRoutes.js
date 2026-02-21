import express from "express";
import {
  manage_quote,
  getProductdata,
  getColor,
  getProvince,
  add_quote_process,
  view_quote,
  view_quote_payment,
  edit_quote,
  edit_quote_process,
  send_for_approval,
  send_for_approve,
  delete_quote,
  set_payment_option,
  add_extra_work_process,
  send_final_quote,
  resend_quote,
  update_quote,
  payment_receive,
  schedule_installation,
  installs,
} from "../controllers/quoteController.js";

const router = express.Router();

router.get("/manage_quote", manage_quote);
router.get("/get_product_data", getProductdata);
router.get("/get_colors", getColor);
router.get("/get_provinces", getProvince);
router.post("/add_quote_process", add_quote_process);
router.get("/view_quote/:quote_id", view_quote);
router.get("/view_quote_payment/:quote_id", view_quote_payment);
router.get("/edit_quote/:quote_id", edit_quote);
router.post("/edit_quote_process", edit_quote_process);
router.post("/send_for_approval", send_for_approval);
router.post("/send_for_approve", send_for_approve);
router.post("/delete_quote", delete_quote);
router.post("/set_payment_option", set_payment_option);
router.post("/add_extra_work_process", add_extra_work_process);
router.post("/send_final_quote", send_final_quote);
router.post("/resend_quote", resend_quote);
router.post("/update_quote", update_quote);
router.post("/payment_receive", payment_receive);
router.post("/schedule_installation", schedule_installation);
router.get("/installs", installs);

export default router;
