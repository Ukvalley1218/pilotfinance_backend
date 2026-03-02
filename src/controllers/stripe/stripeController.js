import stripe from "../../services/stripe.service.js";
import User from "../../models/User.js";
import Activity from "../../models/Activity.js";
import { generateToken } from "../../utils/generateToken.js";
import Settings from "../../models/Settings.model.js";


// --- HELPER: LOG ACTIVITY ---
const logPartnerActivity = async (partnerId, action, details, category) => {
  try {
    await Activity.create({ partnerId, action, details, category });
  } catch (err) {
    console.error("Activity Log Error:", err);
  }
};

// --- GET STRIPE CONFIG + REGISTRATION FEE (No auth needed for publishable key) ---
export const getStripeConfig = async (req, res) => {
  try {
    const settings = await Settings.findOne({ isActive: true });

    const registrationFee = settings?.partnerregistrationfee ?? 0;

    res.status(200).json({
      success: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      registrationFee,
    });
  } catch (err) {
    console.error("Get Stripe Config Error:", err);
    res.status(500).json({ msg: "Failed to fetch config" });
  }
};

// --- CREATE PAYMENT INTENT (Authenticated - user already registered) ---
export const createPartnerRegistrationPayment = async (req, res) => {
  try {
    // User is already authenticated via protect middleware (registered in register.jsx)
    const partnerId = req.user._id || req.user.id;

    const partner = await User.findById(partnerId);

    if (!partner) {
      return res.status(404).json({ msg: "Partner account not found" });
    }

    if (partner.registrationPaymentStatus === "Paid") {
      return res.status(400).json({ msg: "Registration fee already paid" });
    }

    // Fetch registration fee from Settings
    const settings = await Settings.findOne({ isActive: true });

    if (!settings) {
      return res.status(400).json({ msg: "Settings not configured" });
    }

    const registrationFee = settings.partnerregistrationfee ?? 0;

    if (registrationFee <= 0) {
      return res.status(400).json({ msg: "Registration fee not set by admin" });
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: registrationFee * 100, // convert to cents
      currency: "cad",
      metadata: {
        partnerId: partner._id.toString(),
        type: "PartnerRegistration",
      },
      automatic_payment_methods: { enabled: true },
    });

    partner.registrationPaymentIntentId = paymentIntent.id;
    await partner.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      registrationFee,
    });
  } catch (err) {
    console.error("Partner Registration Payment Error:", err);
    res.status(500).json({ msg: "Registration payment failed" });
  }
};

// --- CONFIRM REGISTRATION PAYMENT (called after Stripe payment succeeds on frontend) ---
export const confirmRegistrationPayment = async (req, res) => {
  try {
    const partnerId = req.user._id || req.user.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ msg: "Payment Intent ID is required" });
    }

    // Verify with Stripe that payment actually succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        msg: `Payment not completed. Status: ${paymentIntent.status}`,
      });
    }

    // Verify that this paymentIntent belongs to this partner
    if (paymentIntent.metadata.partnerId !== partnerId.toString()) {
      return res.status(403).json({ msg: "Payment does not belong to this account" });
    }

    // Update partner status
    const partner = await User.findById(partnerId);

    if (!partner) {
      return res.status(404).json({ msg: "Partner not found" });
    }

    partner.registrationPaymentStatus = "Paid";
    partner.status = "Active";
    await partner.save();

    await logPartnerActivity(
      partnerId,
      "Registration Payment Completed",
      `Paid $${paymentIntent.amount / 100} CAD registration fee`,
      "System"
    );

    const token = generateToken(partner._id);

    res.status(200).json({
      success: true,
      msg: "Payment confirmed. Account activated!",
      token,
      user: {
        id: partner._id,
        fullName: partner.fullName,
        email: partner.email,
        role: partner.role,
        status: partner.status,
        registrationPaymentStatus: partner.registrationPaymentStatus,
      },
    });
  } catch (err) {
    console.error("Confirm Registration Payment Error:", err);
    res.status(500).json({ msg: "Payment confirmation failed" });
  }
};

// --- STRIPE WEBHOOK (for payment_intent.succeeded backup) ---
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Payment success
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    if (paymentIntent.metadata.type === "PartnerRegistration") {
      const partnerId = paymentIntent.metadata.partnerId;

      const partner = await User.findById(partnerId);

      if (partner) {
        partner.registrationPaymentStatus = "Paid";
        partner.status = "Active";
        await partner.save();
      }
    }
  }

  res.json({ received: true });
};
