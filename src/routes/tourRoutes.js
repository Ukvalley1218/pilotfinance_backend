import express from "express";
import { getPublicTour } from "../controllers/admin/tourController.js";

const router = express.Router();

/**
 * @route   GET /api/tour
 * @desc    Public tour info (folder link + recruitment-panel visibility flag)
 * @access  Public
 */
router.get("/", getPublicTour);

export default router;