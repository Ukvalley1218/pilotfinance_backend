import express from "express";
import {
  createPartner,
  updatePartner,
  getAllPartners,
  getPartnerById,
  deletePartner,
} from "../../controllers/admin/partnerController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * All routes are prefixed with /api/partner in server.js
 */

// --- GET ROUTES ---
// Handles GET /api/partner
router.get("/", protect, getAllPartners);

// Handles GET /api/partner/partners (Main Table)
router.get("/partners", protect, getAllPartners);

// --- POST ROUTES ---
// Handles POST /api/partner
router.post("/", protect, createPartner);

// Handles POST /api/partner/partners (Registration)
router.post("/partners", protect, createPartner);

// --- ID BASED ROUTES ---

// Handles GET /api/partner/:id
router.get("/:id", protect, getPartnerById);

// FIX: Handles GET /api/partner/partners/:id
// This fixes the 404 in PartnerDetails.jsx when clicking "View"
router.get("/partners/:id", protect, getPartnerById);

// Handles PUT /api/partner/:id
router.put("/:id", protect, updatePartner);

// Handles PUT /api/partner/partners/:id
router.put("/partners/:id", protect, updatePartner);

// Handles DELETE /api/partner/:id
router.delete("/:id", protect, deletePartner);

export default router;
