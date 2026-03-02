import { Router } from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getStripeConfig,
  createPartnerRegistrationPayment,
  confirmRegistrationPayment,
} from "../../controllers/stripe/stripeController.js";

const router = Router();

// Public — returns publishable key + registration fee (no secret keys exposed)
router.get("/config", getStripeConfig);

// Protected — creates payment intent (user must be logged in)
router.post("/createpayment", protect, createPartnerRegistrationPayment);

// Protected — confirms payment & activates account
router.post("/confirm-payment", protect, confirmRegistrationPayment);

export default router;