import express from "express";
import {
  manage_user,
  add_user_process,
  edit_user,
  edit_user_process,
  delete_user,
} from "../controllers/usersController.js";

const router = express.Router();

router.get("/manage_user", manage_user);
router.post("/add_user_process", add_user_process);
router.get("/edit_user/:user_id", edit_user);
router.post("/edit_user_process", edit_user_process);
router.post("/delete_user", delete_user);

export default router;
