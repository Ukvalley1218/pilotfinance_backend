import express from "express";
import {
  createCustomer,
  savePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethodHandler,
  deletePaymentMethod,
  createSetupIntentHandler,
  createPaymentIntentHandler,
  createCardSetupSession,
  verifyCardSetup,
  createFirstPayment,
  verifyFirstPayment,
} from "../../controllers/user/stripeController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/stripe/create-customer
 * @desc    Create a Stripe customer for the logged-in student
 * @access  Private (Student)
 */
router.post("/create-customer", protect, createCustomer);

/**
 * @route   POST /api/stripe/save-payment-method
 * @desc    Save a new payment method (card) for the student
 * @access  Private (Student)
 */
router.post("/save-payment-method", protect, savePaymentMethod);

/**
 * @route   GET /api/stripe/payment-methods
 * @desc    Get all saved payment methods for the student
 * @access  Private (Student)
 */
router.get("/payment-methods", protect, getPaymentMethods);

/**
 * @route   PUT /api/stripe/set-default/:id
 * @desc    Set a payment method as default
 * @access  Private (Student)
 */
router.put("/set-default/:id", protect, setDefaultPaymentMethodHandler);

/**
 * @route   DELETE /api/stripe/payment-methods/:id
 * @desc    Delete a payment method
 * @access  Private (Student)
 */
router.delete("/payment-methods/:id", protect, deletePaymentMethod);

/**
 * @route   POST /api/stripe/create-setup-intent
 * @desc    Create a setup intent for saving payment method
 * @access  Private (Student)
 */
router.post("/create-setup-intent", protect, createSetupIntentHandler);

/**
 * @route   POST /api/stripe/create-payment-intent
 * @desc    Create a payment intent for manual EMI payment
 * @access  Private (Student)
 */
router.post("/create-payment-intent", protect, createPaymentIntentHandler);

/**
 * @route   POST /api/stripe/create-card-setup-session
 * @desc    Create Stripe Checkout Session in setup mode (save card via Stripe page)
 * @access  Private (Student)
 */
router.post("/create-card-setup-session", protect, createCardSetupSession);

/**
 * @route   POST /api/stripe/verify-card-setup
 * @desc    Verify card setup session and save card to DB
 * @access  Private (Student)
 */
router.post("/verify-card-setup", protect, verifyCardSetup);

/**
 * @route   POST /api/stripe/create-first-payment
 * @desc    Create Stripe Checkout Session for first EMI payment (activates auto-debit)
 * @access  Private (Student)
 */
router.post("/create-first-payment", protect, createFirstPayment);

/**
 * @route   POST /api/stripe/verify-first-payment
 * @desc    Verify first payment and activate auto-debit
 * @access  Private (Student)
 */
router.post("/verify-first-payment", protect, verifyFirstPayment);

export default router;