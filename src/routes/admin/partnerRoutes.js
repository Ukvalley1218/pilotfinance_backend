import express from "express";
import { protect, adminOnly } from "../../middlewares/authMiddleware.js";
import {
  createPartner,
  updatePartner,
  getAllPartners,
  getPartnerById,
  deletePartner,
  verifyPartnerKYC,
  approveWithdrawal,
  getAllWithdrawals,
} from "../../controllers/admin/partnerController.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getAllPartners);
router.get("/withdrawals", protect, getAllWithdrawals);
router.post("/", createPartner);
router.get("/:id", getPartnerById);
router.put("/:id", updatePartner);
router.put("/verify/:id", verifyPartnerKYC);
router.delete("/:id", deletePartner);
router.post("/withdraw-approve", protect, approveWithdrawal);


export default router;
