import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
} from "../../controllers/admin/studentController.js";

const router = express.Router();

/**
 * All routes are prefixed with /api/admin/student in server.js
 * These routes manage the unified "User = Student" records.
 */

// --- GET ROUTES ---

// Handles GET /api/admin/student/
router.get("/", protect, getAllStudents);

// FIX: Handles GET /api/admin/student/all
// Matches the updated Dashboard.jsx and Reports.jsx fetch calls
router.get("/all", protect, getAllStudents);

// Handles GET /api/admin/student/students
// Used for the main directory table in the Admin Dashboard
router.get("/students", protect, getAllStudents);

// --- POST ROUTES ---

// Handles POST /api/admin/student/
router.post("/", protect, createStudent);

// FIX: Handles POST /api/admin/student/add
// Clean endpoint for adding records
router.post("/add", protect, createStudent);

// Handles POST /api/admin/student/add_student
router.post("/add_student", protect, createStudent);

// --- ID BASED ROUTES ---

// Handles GET /api/admin/student/:id
router.get("/:id", protect, getStudentById);

// FIX: Handles GET /api/admin/student/students/:id
// This fixes the 404 in StudentDetails.jsx when clicking "View Profile"
router.get("/students/:id", protect, getStudentById);

// Handles PUT /api/admin/student/:id
router.put("/:id", protect, updateStudent);

// FIX: Handles PUT /api/admin/student/students/:id
// Ensures that if you edit details from the profile page, it works
router.put("/students/:id", protect, updateStudent);

// Handles DELETE /api/admin/student/:id
router.delete("/:id", protect, deleteStudent);

export default router;
