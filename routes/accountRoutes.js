import express from "express";
import {
  login_process,
  profile,
  edit_profile_process,
} from "../controllers/accountController.js";

const router = express.Router();

router.post("/login_process", login_process);
router.get("/profile/:user_id", profile);
router.post("/edit_profile_process", edit_profile_process);

export default router;
