import express from "express";
import { protect } from "../middleware/auth.middleware";
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
} from "../controllers/student.controller";

const router = express.Router();

router.post("/add_student", protect, createStudent);
router.put("/students/:id", protect, updateStudent);
router.get("/students", protect, getAllStudents);
router.get("/students/:id", protect, getStudentById);
router.delete("/students/:id", protect, deleteStudent);

export default router;
