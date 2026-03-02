import { Router } from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getStripeConfig,
  createCheckoutSession,
  verifyCheckoutSession,
} from "../../controllers/stripe/stripeController.js";

const router = Router();

// Public — returns registration fee
router.get("/config", getStripeConfig);

// Protected — creates Stripe Checkout Session (redirects to Stripe page)
router.post("/create-checkout-session", protect, createCheckoutSession);

// Protected — verifies payment after Stripe redirects back
router.post("/verify-session", protect, verifyCheckoutSession);

export default router;