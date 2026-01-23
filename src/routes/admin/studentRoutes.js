import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { Student } from "../../models/student.model.js";
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
} from "../../controllers/admin/studentController.js";

const router = express.Router();

/**
 * PREFIX: /api/admin/student
 */

// --- 0. MAINTENANCE ROUTES (Must be at the TOP) ---
router.delete("/maintenance/clear-data", protect, async (req, res) => {
  try {
    const result = await Student.deleteMany({});
    res.status(200).json({
      success: true,
      message: `Database Cleared. ${result.deletedCount} records removed.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 1. DATA AGGREGATION ROUTES ---
router.get("/all", protect, getAllStudents);
router.get("/students", protect, getAllStudents);
router.get("/", protect, getAllStudents);

// --- 2. VERIFICATION & PROFILE ROUTES ---
// ADDED THIS LINE to fix your 404 error:
router.put("/update/:id", protect, updateStudent);

// Standard ID lookups
router.get("/:id", protect, getStudentById);
router.put("/:id", protect, updateStudent);

// Support for nested paths
router.get("/students/:id", protect, getStudentById);
router.put("/students/:id", protect, updateStudent);

// --- 3. MANAGEMENT ROUTES ---
router.post("/add", protect, createStudent);
router.post("/", protect, createStudent);
router.delete("/:id", protect, deleteStudent);

export default router;
