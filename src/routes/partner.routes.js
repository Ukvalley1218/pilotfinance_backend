import express from "express";
import {
  createPartner,
  updatePartner,
  getAllPartners,
  getPartnerById,
  deletePartner,
} from "../controllers/partner.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * All routes are prefixed with /api/partner in server.js
 */

// --- GET ROUTES ---
// Handles GET /api/partner
router.get("/", protect, getAllPartners);

// Handles GET /api/partner/partners
// FIX: This matches the exact URL shown in your tester's console error
router.get("/partners", protect, getAllPartners);

// --- POST ROUTES ---
router.post("/", protect, createPartner);

// --- ID BASED ROUTES ---
router.get("/:id", protect, getPartnerById);
router.put("/:id", protect, updatePartner);
router.delete("/:id", protect, deletePartner);

export default router;
