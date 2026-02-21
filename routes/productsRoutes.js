import express from "express";
import {
  manage_products,
  add_product_process,
  edit_product,
  edit_product_process,
  delete_product,
} from "../controllers/productsController.js";

const router = express.Router();

router.get("/manage_products", manage_products);
router.post("/add_product_process", add_product_process);
router.get("/edit_product/:product_id", edit_product);
router.post("/edit_product_process", edit_product_process);
router.post("/delete_product", delete_product);

export default router;
