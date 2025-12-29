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

router.post("/partners", protect, createPartner);
router.put("/partners/:id", protect, updatePartner);
router.get("/partners", protect, getAllPartners);
router.get("/partners/:id", protect, getPartnerById);
router.delete("/partners/:id", protect, deletePartner);

export default router;
