import express from "express";
import {
  getEMISchedule,
  toggleAutoDebit,
  manualPayEMI,
  getAllEMISchedules,
  getEMIDetails,
} from "../../controllers/user/emiController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/emi/all
 * @desc    Get all EMI schedules for the logged-in student
 * @access  Private (Student)
 */
router.get("/all", protect, getAllEMISchedules);

/**
 * @route   GET /api/emi/schedule/:loanId
 * @desc    Get EMI schedule for a specific loan
 * @access  Private (Student)
 */
router.get("/schedule/:loanId", protect, getEMISchedule);

/**
 * @route   POST /api/emi/toggle-autodebit/:loanId
 * @desc    Toggle auto-debit for a loan
 * @access  Private (Student)
 */
router.post("/toggle-autodebit/:loanId", protect, toggleAutoDebit);

/**
 * @route   GET /api/emi/:emiId
 * @desc    Get EMI details
 * @access  Private (Student)
 */
router.get("/:emiId", protect, getEMIDetails);

/**
 * @route   POST /api/emi/pay/:emiId
 * @desc    Manual EMI payment
 * @access  Private (Student)
 */
router.post("/pay/:emiId", protect, manualPayEMI);

export default router;