import express, { Router } from 'express';
import { getStudentKyc,getPartnerKyc,  deleteKycFile,
  exportKycCsv, } from '../../controllers/admin/admin.kyc.controller.js';
  import { protect } from '../../middlewares/authMiddleware.js';


const router = Router();

router.get("/students", protect, getStudentKyc);
router.get("/partners", protect, getPartnerKyc);
router.delete("/:userId/:field", protect, deleteKycFile);
router.get("/export", protect, exportKycCsv);

export default router;
