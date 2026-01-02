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
 * All routes are protected to ensure only authenticated staff can access partner data
 */

router.post("/", protect, createPartner); // POST /api/partner
router.get("/", protect, getAllPartners); // GET /api/partner
router.get("/:id", protect, getPartnerById); // GET /api/partner/:id
router.put("/:id", protect, updatePartner); // PUT /api/partner/:id
router.delete("/:id", protect, deletePartner); // DELETE /api/partner/:id

export default router;
