import stripe from "../../services/stripe.service.js";
import User from "../../models/User.js";
import { generateToken } from "../../utils/generateToken.js";


// --- HELPER: LOG ACTIVITY ---
const logPartnerActivity = async (partnerId, action, details, category) => {
  try {
    await Activity.create({ partnerId, action, details, category });
  } catch (err) {
    console.error("Activity Log Error:", err);
  }
};

// for create payment 
export const createPartnerRegistrationPayment = async (req, res) => {
  try {
    const { fullName, email, password, companyName, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });

    if (existing && existing.registrationPaymentStatus === "Paid") {
      return res.status(400).json({ msg: "Email already registered & paid" });
    }

    let partner = existing;

    if (!partner) {
      partner = await User.create({
        fullName,
        email: cleanEmail,
        password,
        phone,
        companyName,
        role: "Partner",
        status: "Inactive",
        registrationPaymentStatus: "Pending",
      });
    }

    // 🔹 Fetch registration fee from Settings
    const settings = await Settings.findOne({ isActive: true });

    if (!settings || !settings.partnerregistrationfee) {
      return res.status(400).json({
        msg: "Partner registration fee not configured",
      });
    }

    const registrationFee = settings.partnerregistrationfee;

    // 🔹 Create Stripe Payment Intent
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

    await logPartnerActivity(
      partner._id,
      "Account Created",
      "Partner registered",
      "System"
    );

    const token = generateToken(partner._id);

    res.status(200).json({
      success: true,
      msg: "Partner registered successfully.",
      token,
      clientSecret: paymentIntent.client_secret,
      registrationFee,
    });
  } catch (err) {
    console.error("Partner Registration Payment Error:", err);
    res.status(500).json({ msg: "Registration payment failed" });
  }
};

// for webhook to confirm payment and update loan status
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

