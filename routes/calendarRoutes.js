import express from "express";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/calendarNotesController.js";

const router = express.Router();

// GET /calendar/notes
router.get("/notes", getNotes);

// POST /calendar/notes
router.post("/notes", createNote);

// PUT /calendar/notes/:note_id
router.put("/notes/:note_id", updateNote);

// DELETE /calendar/notes/:note_id
router.delete("/notes/:note_id", deleteNote);

export default router;

