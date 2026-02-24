import stripe from "../../services/stripe.service.js";
import User from "../../models/User.js";

// for create payment 
export const createPartnerRegistrationPayment = async (req, res) => {
  try {
    const { fullName, email, password, companyName, phone } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // 1️⃣ Create partner in Pending mode
    const partner = await User.create({
      fullName,
      email: cleanEmail,
      password,
      phone,
      companyName,
      role: "Partner",
      status: "Inactive",
      registrationPaymentStatus: "Pending",
    });

    // 2️⃣ Create Stripe PaymentIntent
    const registrationFee = 500; // example fixed fee (CAD)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: registrationFee * 100,
      currency: "cad",
      metadata: {
        partnerId: partner._id.toString(),
        type: "PartnerRegistration",
      },
    });

    // Save PaymentIntent ID
    partner.registrationPaymentIntentId = paymentIntent.id;
    await partner.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err);
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

