import express from "express";
import { protect,adminOnly } from "../../middlewares/authMiddleware.js";
import { Student } from "../../models/student.model.js";
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  getStudentDashboardStats,
  updateStudent,
} from "../../controllers/admin/studentController.js";

const router = express.Router();
router.use(protect, adminOnly); // Apply to all routes in this router
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



router.get("/", protect, getAllStudents);




// Standard ID lookups
router.get("/:id", protect, getStudentById);
router.put("/:id", protect, updateStudent);


router.get("/stats", getStudentDashboardStats);

router.post("/", protect, createStudent);
router.delete("/:id", protect, deleteStudent);

export default router;
