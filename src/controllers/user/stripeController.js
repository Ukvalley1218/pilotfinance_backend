import { Student } from "../../models/student.model.js";
import PaymentMethod from "../../models/paymentMethod.model.js";
import Loan from "../../models/loan.js";
import Transaction from "../../models/transaction.model.js";
import {
  createStripeCustomer,
  attachPaymentMethod,
  detachPaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  createPaymentIntent,
  createSetupIntent,
  chargeCustomer,
} from "../../utils/stripe.js";

/**
 * @desc    Create a Stripe customer for the logged-in student
 * @route   POST /api/stripe/create-customer
 * @access  Private (Student)
 */
export const createCustomer = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student by userId
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Check if customer already exists
    if (student.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        msg: "Stripe customer already exists",
        data: { stripeCustomerId: student.stripeCustomerId },
      });
    }

    // Create Stripe customer
    const customer = await createStripeCustomer({
      name: student.name,
      email: student.email,
      phone: student.phone,
      studentId: student._id.toString(),
      userId: userId,
    });

    // Save customer ID to student
    student.stripeCustomerId = customer.id;
    await student.save();

    res.status(200).json({
      success: true,
      msg: "Stripe customer created successfully",
      data: { stripeCustomerId: customer.id },
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to create Stripe customer",
      error: error.message,
    });
  }
};

/**
 * @desc    Save a new payment method (card) for the student
 * @route   POST /api/stripe/save-payment-method
 * @access  Private (Student)
 */
export const savePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.id;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        msg: "Payment method ID is required",
      });
    }

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Ensure Stripe customer exists
    if (!student.stripeCustomerId) {
      const customer = await createStripeCustomer({
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentId: student._id.toString(),
        userId: userId,
      });
      student.stripeCustomerId = customer.id;
      await student.save();
    }

    // Attach payment method to customer
    const paymentMethod = await attachPaymentMethod(
      paymentMethodId,
      student.stripeCustomerId
    );

    // Check if this is the first card - make it default
    const existingCards = await PaymentMethod.find({ studentId: student._id });
    const isDefault = existingCards.length === 0;

    // If this is default, update other cards to not be default
    if (isDefault) {
      await PaymentMethod.updateMany(
        { studentId: student._id },
        { isDefault: false }
      );
    }

    // Save payment method to database
    const newPaymentMethod = await PaymentMethod.create({
      studentId: student._id,
      userId: userId,
      stripePaymentMethodId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand === "American Express" ? "Amex" : paymentMethod.card.brand,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
      isDefault: isDefault,
    });

    // Set as default in Stripe if first card
    if (isDefault) {
      await setDefaultPaymentMethod(student.stripeCustomerId, paymentMethod.id);
    }

    res.status(200).json({
      success: true,
      msg: "Payment method saved successfully",
      data: {
        id: newPaymentMethod._id,
        last4: newPaymentMethod.last4,
        brand: newPaymentMethod.brand,
        expMonth: newPaymentMethod.expMonth,
        expYear: newPaymentMethod.expYear,
        isDefault: newPaymentMethod.isDefault,
      },
    });
  } catch (error) {
    console.error("Save payment method error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to save payment method",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all saved payment methods for the student
 * @route   GET /api/stripe/payment-methods
 * @access  Private (Student)
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Get all active payment methods from database
    const paymentMethods = await PaymentMethod.find({
      studentId: student._id,
      isActive: true,
    }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: paymentMethods.map((pm) => ({
        id: pm._id,
        stripePaymentMethodId: pm.stripePaymentMethodId,
        last4: pm.last4,
        brand: pm.brand,
        expMonth: pm.expMonth,
        expYear: pm.expYear,
        isDefault: pm.isDefault,
        createdAt: pm.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to fetch payment methods",
      error: error.message,
    });
  }
};

/**
 * @desc    Set a payment method as default
 * @route   PUT /api/stripe/set-default/:id
 * @access  Private (Student)
 */
export const setDefaultPaymentMethodHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Find payment method
    const paymentMethod = await PaymentMethod.findOne({
      _id: id,
      studentId: student._id,
      isActive: true,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        msg: "Payment method not found",
      });
    }

    // Update all payment methods to not be default
    await PaymentMethod.updateMany(
      { studentId: student._id },
      { isDefault: false }
    );

    // Set this one as default
    paymentMethod.isDefault = true;
    await paymentMethod.save();

    // Update in Stripe
    if (student.stripeCustomerId) {
      await setDefaultPaymentMethod(
        student.stripeCustomerId,
        paymentMethod.stripePaymentMethodId
      );
    }

    res.status(200).json({
      success: true,
      msg: "Default payment method updated",
      data: paymentMethod,
    });
  } catch (error) {
    console.error("Set default payment method error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to set default payment method",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a payment method
 * @route   DELETE /api/stripe/payment-methods/:id
 * @access  Private (Student)
 */
export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Find payment method
    const paymentMethod = await PaymentMethod.findOne({
      _id: id,
      studentId: student._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        msg: "Payment method not found",
      });
    }

    // Detach from Stripe
    try {
      await detachPaymentMethod(paymentMethod.stripePaymentMethodId);
    } catch (stripeError) {
      console.error("Stripe detach error:", stripeError);
      // Continue even if Stripe detach fails
    }

    // Soft delete in database
    paymentMethod.isActive = false;
    await paymentMethod.save();

    // If this was the default, set another card as default
    if (paymentMethod.isDefault) {
      const nextDefault = await PaymentMethod.findOne({
        studentId: student._id,
        isActive: true,
        _id: { $ne: id },
      });

      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();

        if (student.stripeCustomerId) {
          await setDefaultPaymentMethod(
            student.stripeCustomerId,
            nextDefault.stripePaymentMethodId
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      msg: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Delete payment method error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to delete payment method",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a setup intent for saving payment method
 * @route   POST /api/stripe/create-setup-intent
 * @access  Private (Student)
 */
export const createSetupIntentHandler = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Ensure Stripe customer exists
    if (!student.stripeCustomerId) {
      const customer = await createStripeCustomer({
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentId: student._id.toString(),
        userId: userId,
      });
      student.stripeCustomerId = customer.id;
      await student.save();
    }

    // Create setup intent
    const setupIntent = await createSetupIntent(student.stripeCustomerId);

    res.status(200).json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
        customerId: student.stripeCustomerId,
      },
    });
  } catch (error) {
    console.error("Create setup intent error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to create setup intent",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a payment intent for manual EMI payment
 * @route   POST /api/stripe/create-payment-intent
 * @access  Private (Student)
 */
export const createPaymentIntentHandler = async (req, res) => {
  try {
    const { amount, loanId, emiId } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        msg: "Valid amount is required",
      });
    }

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Ensure Stripe customer exists
    if (!student.stripeCustomerId) {
      const customer = await createStripeCustomer({
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentId: student._id.toString(),
        userId: userId,
      });
      student.stripeCustomerId = customer.id;
      await student.save();
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amount,
      student.stripeCustomerId,
      null,
      {
        loanId: loanId || "",
        emiId: emiId || "",
        studentId: student._id.toString(),
        type: "emi_payment",
      }
    );

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
      },
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to create payment intent",
      error: error.message,
    });
  }
};

/**
 * @desc    Process auto-debit for EMI
 * @route   POST /api/stripe/process-auto-debit
 * @access  Private (System/Internal)
 */
export const processAutoDebit = async (req, res) => {
  try {
    const { emiScheduleId } = req.body;

    // This endpoint is typically called by the scheduler
    // Import EMISchedule model here to avoid circular dependency
    const EMISchedule = (await import("../../models/emiSchedule.model.js")).default;

    // Find EMI schedule
    const emi = await EMISchedule.findById(emiScheduleId)
      .populate("loanId")
      .populate("studentId");

    if (!emi) {
      return res.status(404).json({
        success: false,
        msg: "EMI schedule not found",
      });
    }

    if (emi.status !== "pending") {
      return res.status(400).json({
        success: false,
        msg: `EMI already ${emi.status}`,
      });
    }

    // Get student
    const student = await Student.findById(emi.studentId);
    if (!student || !student.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        msg: "Student does not have a Stripe account",
      });
    }

    // Get default payment method
    const defaultPaymentMethod = await PaymentMethod.findOne({
      studentId: student._id,
      isDefault: true,
      isActive: true,
    });

    if (!defaultPaymentMethod) {
      return res.status(400).json({
        success: false,
        msg: "No default payment method found",
      });
    }

    // Calculate total amount (EMI + late fee if applicable)
    const totalAmount = emi.amount + (emi.lateFee || 0);

    // Charge customer
    const paymentIntent = await chargeCustomer(
      totalAmount,
      student.stripeCustomerId,
      defaultPaymentMethod.stripePaymentMethodId,
      {
        emiId: emi._id.toString(),
        loanId: emi.loanId._id.toString(),
        studentId: student._id.toString(),
        installmentNumber: emi.installmentNumber.toString(),
        type: "auto_debit_emi",
      }
    );

    // Update EMI with payment intent ID
    emi.stripePaymentIntentId = paymentIntent.id;
    emi.paymentMethodId = defaultPaymentMethod._id;
    await emi.save();

    res.status(200).json({
      success: true,
      msg: "Auto-debit initiated",
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      },
    });
  } catch (error) {
    console.error("Process auto-debit error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to process auto-debit",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a Stripe Checkout Session in SETUP mode (for saving card)
 * @route   POST /api/stripe/create-card-setup-session
 * @access  Private (Student)
 */
export const createCardSetupSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { frontendUrl } = req.body;
    const origin = frontendUrl || req.headers.origin || "http://localhost:5173";

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student profile not found" });
    }

    // Ensure Stripe customer exists
    if (!student.stripeCustomerId) {
      const { createStripeCustomer: createCust } = await import("../../utils/stripe.js");
      const customer = await createCust({
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentId: student._id.toString(),
        userId: userId,
      });
      student.stripeCustomerId = customer.id;
      await student.save();
    }

    // Import stripe service
    const stripe = (await import("../../services/stripe.service.js")).default;

    // Create Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: student.stripeCustomerId,
      payment_method_types: ["card"],
      success_url: `${origin}/add-card?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/add-card?cancelled=true`,
      metadata: {
        studentId: student._id.toString(),
        userId: userId,
        type: "card_setup",
      },
    });

    res.status(200).json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Create card setup session error:", error);
    res.status(500).json({ success: false, msg: "Failed to create card setup session", error: error.message });
  }
};

/**
 * @desc    Verify card setup session and save card to DB
 * @route   POST /api/stripe/verify-card-setup
 * @access  Private (Student)
 */
export const verifyCardSetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, msg: "Session ID is required" });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student profile not found" });
    }

    const stripe = (await import("../../services/stripe.service.js")).default;

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["setup_intent.payment_method"],
    });

    if (session.status !== "complete") {
      return res.status(400).json({ success: false, msg: `Setup not complete. Status: ${session.status}` });
    }

    // Get the saved payment method from the setup intent
    const setupIntent = session.setup_intent;
    const paymentMethod = setupIntent.payment_method;

    if (!paymentMethod || !paymentMethod.card) {
      return res.status(400).json({ success: false, msg: "No card information found" });
    }

    // Check if card already saved
    const existingCard = await PaymentMethod.findOne({
      stripePaymentMethodId: paymentMethod.id,
      studentId: student._id,
      isActive: true,
    });

    if (existingCard) {
      return res.status(200).json({
        success: true,
        msg: "Card already saved",
        data: {
          id: existingCard._id,
          last4: existingCard.last4,
          brand: existingCard.brand,
          expMonth: existingCard.expMonth,
          expYear: existingCard.expYear,
          isDefault: existingCard.isDefault,
        },
      });
    }

    // Check if first card (make it default)
    const existingCards = await PaymentMethod.find({ studentId: student._id, isActive: true });
    const isDefault = existingCards.length === 0;

    // Save card in our DB
    const newCard = await PaymentMethod.create({
      studentId: student._id,
      userId: userId,
      stripePaymentMethodId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand === "American Express" ? "Amex" : paymentMethod.card.brand,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
      isDefault: isDefault,
    });

    // Set as default in Stripe if first card
    if (isDefault) {
      const { setDefaultPaymentMethod: setDefault } = await import("../../utils/stripe.js");
      await setDefault(student.stripeCustomerId, paymentMethod.id);
    }

    res.status(200).json({
      success: true,
      msg: "Card saved successfully!",
      data: {
        id: newCard._id,
        last4: newCard.last4,
        brand: newCard.brand,
        expMonth: newCard.expMonth,
        expYear: newCard.expYear,
        isDefault: newCard.isDefault,
      },
    });
  } catch (error) {
    console.error("Verify card setup error:", error);
    res.status(500).json({ success: false, msg: "Failed to verify card setup", error: error.message });
  }
};

/**
 * @desc    Create Stripe Checkout Session for first EMI payment (activates auto-debit)
 * @route   POST /api/stripe/create-first-payment
 * @access  Private (Student)
 */
export const createFirstPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { loanId, frontendUrl } = req.body;
    const origin = frontendUrl || req.headers.origin || "http://localhost:5174";

    if (!loanId) {
      return res.status(400).json({ success: false, msg: "Loan ID is required" });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student profile not found" });
    }

    // Check for default payment method
    const defaultPaymentMethod = await PaymentMethod.findOne({
      studentId: student._id,
      isDefault: true,
      isActive: true,
    });

    if (!defaultPaymentMethod) {
      return res.status(400).json({
        success: false,
        msg: "Please add a payment method before making a payment",
        requiresPaymentMethod: true,
      });
    }

    // Ensure Stripe customer exists
    if (!student.stripeCustomerId) {
      const { createStripeCustomer: createCust } = await import("../../utils/stripe.js");
      const customer = await createCust({
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentId: student._id.toString(),
        userId: userId,
      });
      student.stripeCustomerId = customer.id;
      await student.save();
    }

    // Find loan
    const loan = await Loan.findOne({ _id: loanId, studentId: student._id });
    if (!loan) {
      return res.status(404).json({ success: false, msg: "Loan not found" });
    }

    // Find first pending EMI
    const EMIScheduleModel = (await import("../../models/emiSchedule.model.js")).default;
    const emi = await EMIScheduleModel.findOne({
      loanId: loan._id,
      status: { $in: ["pending", "overdue"] },
    }).sort({ installmentNumber: 1 });

    if (!emi) {
      return res.status(400).json({ success: false, msg: "No pending EMIs found for this loan" });
    }

    // Calculate total with late fee if overdue
    let totalAmount = emi.amount;
    const daysOverdue = Math.max(0, Math.ceil((new Date() - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24)));
    if (daysOverdue > 0) {
      const lateFeePercentage = Math.min(daysOverdue * 0.01, 0.1);
      const lateFee = Math.round(emi.amount * lateFeePercentage * 100) / 100;
      totalAmount = emi.amount + lateFee;
    }

    const stripe = (await import("../../services/stripe.service.js")).default;

    // Create Checkout Session for payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: student.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `EMI Payment - Installment #${emi.installmentNumber}`,
              description: `Loan: ${loan.loanId} | ${loan.category}`,
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        emiId: emi._id.toString(),
        loanId: loan._id.toString(),
        studentId: student._id.toString(),
        userId: userId,
        type: "first_payment",
        installmentNumber: emi.installmentNumber.toString(),
      },
      success_url: `${origin}/auto-debit?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/auto-debit?payment_cancelled=true`,
    });

    res.status(200).json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
      amount: totalAmount,
      installmentNumber: emi.installmentNumber,
    });
  } catch (error) {
    console.error("Create first payment error:", error);
    res.status(500).json({ success: false, msg: "Failed to create payment session", error: error.message });
  }
};

/**
 * @desc    Verify first payment and activate auto-debit
 * @route   POST /api/stripe/verify-first-payment
 * @access  Private (Student)
 */
export const verifyFirstPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, msg: "Session ID is required" });
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student profile not found" });
    }

    const stripe = (await import("../../services/stripe.service.js")).default;

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ success: false, msg: `Payment not completed. Status: ${session.payment_status}` });
    }

    // Verify ownership
    if (session.metadata.studentId !== student._id.toString()) {
      return res.status(403).json({ success: false, msg: "Session does not belong to this student" });
    }

    const emiId = session.metadata.emiId;
    const loanId = session.metadata.loanId;
    const EMIScheduleModel = (await import("../../models/emiSchedule.model.js")).default;
    const emi = await EMIScheduleModel.findById(emiId).populate("loanId");

    if (!emi) {
      return res.status(404).json({ success: false, msg: "EMI not found" });
    }

    // Idempotent — if already paid, return success
    if (emi.status === "paid") {
      const loan = await Loan.findById(loanId);
      return res.status(200).json({
        success: true,
        msg: "Payment already verified",
        autoDebitEnabled: loan.autoDebitEnabled,
        data: {
          emiId: emi._id,
          amount: emi.totalAmount || emi.amount,
          paidAt: emi.paidAt,
          loanStatus: loan.status,
          autoDebitEnabled: loan.autoDebitEnabled,
        },
      });
    }

    // Calculate total
    const totalAmount = session.amount_total / 100;

    // Calculate late fee if applicable
    const daysOverdue = Math.max(0, Math.ceil((new Date() - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24)));
    if (daysOverdue > 0) {
      const lateFeePercentage = Math.min(daysOverdue * 0.01, 0.1);
      emi.lateFee = Math.round(emi.amount * lateFeePercentage * 100) / 100;
    }
    emi.totalAmount = totalAmount;

    // Mark EMI as paid
    emi.status = "paid";
    emi.paidAt = new Date();
    emi.stripePaymentIntentId = session.payment_intent;

    // Get default payment method for auto-debit
    const defaultPaymentMethod = await PaymentMethod.findOne({
      studentId: student._id,
      isDefault: true,
      isActive: true,
    });

    if (defaultPaymentMethod) {
      emi.paymentMethodId = defaultPaymentMethod._id;
    }

    // Create transaction
    const transaction = await Transaction.create({
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: userId,
      studentId: student._id,
      type: "Debit",
      desc: `EMI Payment - Installment ${emi.installmentNumber}`,
      subDesc: `Loan Ref: ${emi.loanId.loanId}`,
      amount: totalAmount,
      status: "Completed",
    });

    emi.transactionId = transaction._id;
    await emi.save();

    // Update loan
    const loan = await Loan.findById(loanId);
    loan.paidAmount += totalAmount;

    // Check if this was the first EMI payment - auto-enable auto-debit
    const paidEMIsCount = await EMIScheduleModel.countDocuments({
      loanId: loan._id,
      status: "paid",
    });

    let autoDebitActivated = false;
    if (paidEMIsCount === 1 && defaultPaymentMethod) {
      // First EMI paid - auto-enable auto-debit
      loan.autoDebitEnabled = true;
      loan.defaultPaymentMethod = defaultPaymentMethod._id;
      loan.autoDebitStatus = "active";
      autoDebitActivated = true;
      console.log(`Auto-debit activated for loan ${loan.loanId}`);
    }

    // Check if loan is completed
    if (loan.paidAmount >= loan.totalWithInterest - 0.5) {
      loan.status = "Completed";
      loan.paidAmount = loan.totalWithInterest;
    }

    // Update next payment due date
    const nextEMI = await EMIScheduleModel.findOne({
      loanId: loan._id,
      status: "pending",
    }).sort({ dueDate: 1 });

    if (nextEMI) {
      loan.nextPaymentDueDate = nextEMI.dueDate;
    }

    await loan.save();

    res.status(200).json({
      success: true,
      msg: autoDebitActivated
        ? "Payment successful! Auto-debit has been activated for future payments."
        : "Payment verified and recorded",
      autoDebitActivated,
      data: {
        emiId: emi._id,
        amount: totalAmount,
        paidAt: emi.paidAt,
        transactionId: transaction.id,
        loanStatus: loan.status,
        autoDebitEnabled: loan.autoDebitEnabled,
        autoDebitStatus: loan.autoDebitStatus,
        paidEMIs: paidEMIsCount,
        totalEMIs: await EMIScheduleModel.countDocuments({ loanId: loan._id }),
      },
    });
  } catch (error) {
    console.error("Verify first payment error:", error);
    res.status(500).json({ success: false, msg: "Failed to verify payment", error: error.message });
  }
};

export default {
  createCustomer,
  savePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethodHandler,
  deletePaymentMethod,
  createSetupIntentHandler,
  createPaymentIntentHandler,
  processAutoDebit,
  createCardSetupSession,
  verifyCardSetup,
  createFirstPayment,
  verifyFirstPayment,
};