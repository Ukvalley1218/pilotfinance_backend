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
// Used for the main directory table
router.get("/students", protect, getAllStudents);

// --- POST ROUTES ---
// Handles POST /api/student
router.post("/", protect, createStudent);

// Handles POST /api/student/add_student
router.post("/add_student", protect, createStudent);

// --- ID BASED ROUTES ---

// Handles GET /api/student/:id
router.get("/:id", protect, getStudentById);

// FIX: Handles GET /api/student/students/:id
// This fixes the 404 in StudentDetails.jsx when clicking "View Profile"
router.get("/students/:id", protect, getStudentById);

// Handles PUT /api/student/:id
router.put("/:id", protect, updateStudent);

// FIX: Handles PUT /api/student/students/:id
// Ensures that if you edit details from the profile page, it works
router.put("/students/:id", protect, updateStudent);

// Handles DELETE /api/student/:id
router.delete("/:id", protect, deleteStudent);

export default router;
