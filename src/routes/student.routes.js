import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
} from "../controllers/student.controller.js";

const router = express.Router();

/**
 * All routes are prefixed with /api/student in server.js
 * All routes are protected via JWT middleware
 */

router.post("/", protect, createStudent); // POST /api/student
router.get("/", protect, getAllStudents); // GET /api/student
router.get("/:id", protect, getStudentById); // GET /api/student/:id
router.put("/:id", protect, updateStudent); // PUT /api/student/:id
router.delete("/:id", protect, deleteStudent); // DELETE /api/student/:id

export default router;
