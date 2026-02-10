import express from "express";
import { protect, adminOnly } from "../../middlewares/authMiddleware.js";
import {
  createPartner,
  updatePartner,
  getAllPartners,
  getPartnerById,
  deletePartner,
  verifyPartnerKYC,
} from "../../controllers/admin/partnerController.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getAllPartners);
router.post("/", createPartner);
router.get("/:id", getPartnerById);
router.put("/:id", updatePartner);
router.put("/:id", verifyPartnerKYC);
router.delete("/:id", deletePartner);

export default router;
