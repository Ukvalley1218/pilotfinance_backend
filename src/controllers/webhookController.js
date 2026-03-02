import { verifyWebhookSignature } from "../utils/stripe.js";
import EMISchedule from "../models/emiSchedule.model.js";
import Transaction from "../models/transaction.model.js";
import Loan from "../models/loan.js";
import { Student } from "../models/student.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";

/**
 * @desc    Handle Stripe webhooks
 * @route   POST /api/webhooks/stripe
 * @access  Public (Stripe)
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = verifyWebhookSignature(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object);
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  const { id, amount, customer, metadata } = paymentIntent;

  console.log(`Payment succeeded: ${id}, Amount: ${amount / 100}`);

  // If this is an EMI payment
  if (metadata.type === "emi_payment" || metadata.type === "auto_debit_emi") {
    const emiId = metadata.emiId;

    if (emiId) {
      const emi = await EMISchedule.findById(emiId).populate("loanId");

      if (emi && emi.status !== "paid") {
        // Calculate late fee if overdue
        const daysOverdue = Math.max(0, Math.ceil((new Date() - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24)));
        if (daysOverdue > 0 && !emi.lateFee) {
          const lateFeePercentage = Math.min(daysOverdue * 0.01, 0.1);
          emi.lateFee = Math.round(emi.amount * lateFeePercentage * 100) / 100;
        }

        // Update EMI status
        emi.status = "paid";
        emi.paidAt = new Date();
        emi.stripePaymentIntentId = id;
        emi.totalAmount = amount / 100; // Convert from cents

        // Get student
        const student = await Student.findById(emi.studentId);

        // Create transaction
        const transaction = await Transaction.create({
          id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          userId: student?.userId,
          studentId: emi.studentId,
          type: "Debit",
          desc: `EMI Payment - Installment ${emi.installmentNumber}`,
          subDesc: `Loan Ref: ${emi.loanId?.loanId || emi.loanId}`,
          amount: amount / 100, // Convert from cents
          status: "Completed",
        });

        emi.transactionId = transaction._id;
        await emi.save();

        // Update loan
        const loan = await Loan.findById(emi.loanId._id || emi.loanId);
        if (loan) {
          loan.paidAmount += amount / 100;

          // Check if loan is completed
          if (loan.paidAmount >= loan.totalWithInterest - 0.5) {
            loan.status = "Completed";
            loan.paidAmount = loan.totalWithInterest;
          }

          // Update next payment due date
          const nextEMI = await EMISchedule.findOne({
            loanId: loan._id,
            status: "pending",
          }).sort({ dueDate: 1 });

          if (nextEMI) {
            loan.nextPaymentDueDate = nextEMI.dueDate;
          }

          await loan.save();
        }

        console.log(`EMI ${emiId} marked as paid via webhook`);
      } else if (emi && emi.status === "paid") {
        console.log(`EMI ${emiId} already marked as paid, skipping duplicate processing`);
      }
    }
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
  const { id, last_payment_error, metadata } = paymentIntent;

  console.log(`Payment failed: ${id}, Error: ${last_payment_error?.message}`);

  // If this is an auto-debit EMI payment
  if (metadata.type === "auto_debit_emi") {
    const emiId = metadata.emiId;

    if (emiId) {
      const emi = await EMISchedule.findById(emiId);

      if (emi) {
        // Increment retry count
        emi.retryCount += 1;
        emi.lastRetryAt = new Date();
        emi.notes = last_payment_error?.message || "Payment failed";

        // Check if max retries reached
        if (emi.retryCount >= emi.maxRetries) {
          emi.status = "failed";
          emi.notes = `Max retries reached. Last error: ${last_payment_error?.message || "Unknown"}`;

          // Update loan auto-debit status
          const loan = await Loan.findById(emi.loanId);
          if (loan) {
            loan.autoDebitStatus = "failed";
            await loan.save();
          }

          // TODO: Send notification to student about failed auto-debit
          console.log(`EMI ${emiId} marked as failed after ${emi.retryCount} retries`);
        } else {
          // Schedule next retry (in 24 hours)
          const nextRetry = new Date();
          nextRetry.setHours(nextRetry.getHours() + 24);
          emi.nextRetryAt = nextRetry;
        }

        await emi.save();
      }
    }
  }
}

/**
 * Handle successful setup intent
 */
async function handleSetupIntentSucceeded(setupIntent) {
  const { id, customer, payment_method } = setupIntent;

  console.log(`Setup intent succeeded: ${id}`);

  // The payment method will be handled by payment_method.attached event
  // This is just for logging or additional processing
}

/**
 * Handle payment method attached to customer
 */
async function handlePaymentMethodAttached(paymentMethod) {
  const { id, customer, card } = paymentMethod;

  console.log(`Payment method attached: ${id} to customer: ${customer}`);

  // Find student by stripeCustomerId
  const student = await Student.findOne({ stripeCustomerId: customer });

  if (student) {
    // Check if payment method already exists
    const existingPM = await PaymentMethod.findOne({
      stripePaymentMethodId: id,
    });

    if (!existingPM) {
      // Determine card brand
      let brand = card.brand;
      if (brand === "American Express") brand = "Amex";

      // Check if this is the first card
      const existingCards = await PaymentMethod.find({
        studentId: student._id,
        isActive: true,
      });
      const isDefault = existingCards.length === 0;

      // Create payment method record
      await PaymentMethod.create({
        studentId: student._id,
        userId: student.userId,
        stripePaymentMethodId: id,
        last4: card.last4,
        brand: brand,
        expMonth: card.exp_month,
        expYear: card.exp_year,
        isDefault: isDefault,
      });

      console.log(`Payment method ${id} saved for student ${student._id}`);
    }
  }
}

export default {
  handleStripeWebhook,
};