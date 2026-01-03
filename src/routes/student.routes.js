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
 */

// --- GET ROUTES ---
// Handles GET /api/student
router.get("/", protect, getAllStudents);

// Handles GET /api/student/students
// FIX: This matches the exact URL shown in your tester's console error
router.get("/students", protect, getAllStudents);

// --- POST ROUTES ---
router.post("/", protect, createStudent);

// --- ID BASED ROUTES ---
router.get("/:id", protect, getStudentById);
router.put("/:id", protect, updateStudent);
router.delete("/:id", protect, deleteStudent);

export default router;
