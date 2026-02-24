import { Router } from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { createPartnerRegistrationPayment } from "../../controllers/stripe/stripeController.js";

const router = Router();

router.post("/createpayment", protect, createPartnerRegistrationPayment);

export default router;