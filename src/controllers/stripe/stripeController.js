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

// --- GET STRIPE CONFIG + REGISTRATION FEE ---
export const getStripeConfig = async (req, res) => {
  try {
    const settings = await Settings.findOne({ isActive: true });
    const registrationFee = settings?.partnerregistrationfee ?? 0;

    res.status(200).json({
      success: true,
      registrationFee,
    });
  } catch (err) {
    console.error("Get Stripe Config Error:", err);
    res.status(500).json({ msg: "Failed to fetch config" });
  }
};

// --- CREATE CHECKOUT SESSION (Opens Stripe Hosted Payment Page) ---
export const createCheckoutSession = async (req, res) => {
  try {
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

    // Get the frontend origin from the request or use env variable
    const { frontendUrl } = req.body;
    const origin = frontendUrl || req.headers.origin || "http://localhost:5173";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "Partner Registration Fee",
              description: "One-time registration fee to activate your Pilot Finance partner account",
            },
            unit_amount: registrationFee * 100, // convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        partnerId: partner._id.toString(),
        type: "PartnerRegistration",
      },
      customer_email: partner.email,
      success_url: `${origin}/registration-flow?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/registration-flow?cancelled=true`,
    });

    // Save session ID to partner record
    partner.registrationPaymentIntentId = session.id;
    await partner.save();

    res.status(200).json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
      registrationFee,
    });
  } catch (err) {
    console.error("Checkout Session Error:", err);
    res.status(500).json({ msg: "Failed to create checkout session" });
  }
};

// --- VERIFY CHECKOUT SESSION (called after Stripe redirects back) ---
export const verifyCheckoutSession = async (req, res) => {
  try {
    const partnerId = req.user._id || req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ msg: "Session ID is required" });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        msg: `Payment not completed. Status: ${session.payment_status}`,
      });
    }

    // Verify this session belongs to this partner
    if (session.metadata.partnerId !== partnerId.toString()) {
      return res.status(403).json({ msg: "Session does not belong to this account" });
    }

    // Update partner status
    const partner = await User.findById(partnerId);

    if (!partner) {
      return res.status(404).json({ msg: "Partner not found" });
    }

    // Only update if not already paid (idempotent)
    if (partner.registrationPaymentStatus !== "Paid") {
      partner.registrationPaymentStatus = "Paid";
      partner.status = "Active";
      await partner.save();

      await logPartnerActivity(
        partnerId,
        "Registration Payment Completed",
        `Paid $${session.amount_total / 100} CAD registration fee`,
        "System"
      );
    }

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
    console.error("Verify Session Error:", err);
    res.status(500).json({ msg: "Payment verification failed" });
  }
};

// --- STRIPE WEBHOOK (backup for payment confirmation) ---
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

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.metadata.type === "PartnerRegistration" && session.payment_status === "paid") {
      const partnerId = session.metadata.partnerId;
      const partner = await User.findById(partnerId);

      if (partner && partner.registrationPaymentStatus !== "Paid") {
        partner.registrationPaymentStatus = "Paid";
        partner.status = "Active";
        await partner.save();
      }
    }
  }

  // Also handle payment_intent.succeeded for other use cases
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    if (paymentIntent.metadata.type === "PartnerRegistration") {
      const partnerId = paymentIntent.metadata.partnerId;
      const partner = await User.findById(partnerId);

      if (partner && partner.registrationPaymentStatus !== "Paid") {
        partner.registrationPaymentStatus = "Paid";
        partner.status = "Active";
        await partner.save();
      }
    }
  }

  res.json({ received: true });
};
