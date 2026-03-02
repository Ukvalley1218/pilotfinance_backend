import cron from "node-cron";
import EMISchedule from "../models/emiSchedule.model.js";
import Loan from "../models/loan.js";
import { Student } from "../models/student.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import Transaction from "../models/transaction.model.js";
import { chargeCustomer } from "../utils/stripe.js";

/**
 * EMI Scheduler for Auto-Debit Processing
 * Runs daily at 9:00 AM UTC
 */
class EMIScheduler {
  constructor() {
    this.job = null;
    this.overdueJob = null;
  }

  /**
   * Start the EMI scheduler
   */
  start() {
    // Run daily at 9:00 AM UTC - Process EMIs
    this.job = cron.schedule("0 9 * * *", async () => {
      console.log("Running EMI auto-debit scheduler...");
      await this.processEMIs();
    });

    // Run daily at 00:05 AM UTC - Mark overdue EMIs
    this.overdueJob = cron.schedule("5 0 * * *", async () => {
      console.log("Running overdue EMI marker...");
      await this.markOverdueEMIs();
    });

    console.log("EMI Scheduler started - running daily at 9:00 AM UTC (process) and 00:05 AM UTC (mark overdue)");
  }

  /**
   * Stop the EMI scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
    }
    if (this.overdueJob) {
      this.overdueJob.stop();
    }
    console.log("EMI Scheduler stopped");
  }

  /**
   * Process all pending EMIs
   */
  async processEMIs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all pending EMIs that are due today or overdue
      const pendingEMIs = await EMISchedule.find({
        status: { $in: ["pending", "overdue"] },
        dueDate: { $lte: today },
      })
        .populate("loanId")
        .populate("studentId");

      console.log(`Found ${pendingEMIs.length} EMIs to process`);

      for (const emi of pendingEMIs) {
        await this.processEMI(emi);
      }

      // Also check for retries
      await this.processRetries();
    } catch (error) {
      console.error("Error in EMI scheduler:", error);
    }
  }

  /**
   * Process a single EMI
   */
  async processEMI(emi) {
    try {
      const loan = emi.loanId;
      const student = emi.studentId;

      // Skip if already paid
      if (emi.status === "paid") {
        console.log(`EMI ${emi._id} already paid, skipping`);
        return;
      }

      // Check if auto-debit is enabled for this loan
      if (!loan.autoDebitEnabled || loan.autoDebitStatus !== "active") {
        console.log(`Auto-debit not enabled for loan ${loan.loanId}`);
        return;
      }

      // Check if student has Stripe customer ID
      if (!student.stripeCustomerId) {
        console.log(`Student ${student._id} does not have Stripe customer ID`);
        return;
      }

      // Get default payment method
      const defaultPaymentMethod = await PaymentMethod.findOne({
        studentId: student._id,
        isDefault: true,
        isActive: true,
      });

      if (!defaultPaymentMethod) {
        console.log(`No default payment method for student ${student._id}`);
        return;
      }

      // Calculate total amount (EMI + late fee if overdue)
      let totalAmount = emi.amount;
      const daysOverdue = Math.max(0, Math.ceil((new Date() - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24)));

      if (daysOverdue > 0) {
        // Add late fee (e.g., 1% per day, max 10%)
        const lateFeePercentage = Math.min(daysOverdue * 0.01, 0.1);
        emi.lateFee = Math.round(emi.amount * lateFeePercentage * 100) / 100;
        totalAmount = emi.amount + emi.lateFee;
        console.log(`EMI ${emi._id} is ${daysOverdue} days overdue. Late fee: $${emi.lateFee}`);
      }

      emi.totalAmount = totalAmount;
      console.log(`Processing EMI ${emi._id} for $${totalAmount} (EMI: $${emi.amount}, Late Fee: $${emi.lateFee || 0})`);

      // Charge the customer
      const paymentIntent = await chargeCustomer(
        totalAmount,
        student.stripeCustomerId,
        defaultPaymentMethod.stripePaymentMethodId,
        {
          emiId: emi._id.toString(),
          loanId: loan._id.toString(),
          studentId: student._id.toString(),
          installmentNumber: emi.installmentNumber.toString(),
          type: "auto_debit_emi",
          lateFee: (emi.lateFee || 0).toString(),
        }
      );

      // Update EMI with payment intent ID
      emi.stripePaymentIntentId = paymentIntent.id;
      emi.paymentMethodId = defaultPaymentMethod._id;

      // If payment succeeded immediately
      if (paymentIntent.status === "succeeded") {
        await this.handleSuccessfulPayment(emi, paymentIntent);
      } else {
        // Payment is processing or requires action
        console.log(`Payment for EMI ${emi._id} is ${paymentIntent.status}`);
      }

      await emi.save();
    } catch (error) {
      console.error(`Error processing EMI ${emi._id}:`, error);
      await this.handleFailedPayment(emi, error);
    }
  }

  /**
   * Handle successful payment
   */
  async handleSuccessfulPayment(emi, paymentIntent) {
    try {
      const loan = await Loan.findById(emi.loanId);
      const student = await Student.findById(emi.studentId);

      // Update EMI status
      emi.status = "paid";
      emi.paidAt = new Date();
      emi.totalAmount = paymentIntent.amount / 100; // Convert from cents

      // Create transaction
      const transaction = await Transaction.create({
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: student?.userId,
        studentId: student._id,
        type: "Debit",
        desc: `EMI Payment - Installment ${emi.installmentNumber}`,
        subDesc: `Loan Ref: ${loan.loanId}`,
        amount: paymentIntent.amount / 100, // Convert from cents
        status: "Completed",
      });

      emi.transactionId = transaction._id;

      // Update loan
      loan.paidAmount += paymentIntent.amount / 100;

      // Check if loan is completed
      if (loan.paidAmount >= loan.totalWithInterest - 0.5) {
        loan.status = "Completed";
        loan.paidAmount = loan.totalWithInterest;
      }

      // Update next payment due date to the next pending EMI
      const nextEMI = await EMISchedule.findOne({
        loanId: loan._id,
        status: "pending",
      }).sort({ dueDate: 1 });

      if (nextEMI) {
        loan.nextPaymentDueDate = nextEMI.dueDate;
      }

      await loan.save();
      console.log(`EMI ${emi._id} successfully paid via auto-debit`);
    } catch (error) {
      console.error("Error handling successful payment:", error);
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(emi, error) {
    emi.retryCount += 1;
    emi.lastRetryAt = new Date();
    emi.notes = error.message || "Payment failed";

    if (emi.retryCount >= emi.maxRetries) {
      emi.status = "failed";

      // Update loan auto-debit status
      const loan = await Loan.findById(emi.loanId);
      if (loan) {
        loan.autoDebitStatus = "failed";
        await loan.save();
      }

      console.log(`EMI ${emi._id} marked as failed after ${emi.retryCount} retries`);
    } else {
      // Schedule next retry
      const nextRetry = new Date();
      nextRetry.setHours(nextRetry.getHours() + 24);
      emi.nextRetryAt = nextRetry;
    }

    await emi.save();
  }

  /**
   * Process scheduled retries
   */
  async processRetries() {
    try {
      const now = new Date();

      // Find EMIs scheduled for retry
      const retryEMIs = await EMISchedule.find({
        status: "pending",
        retryCount: { $gt: 0 },
        nextRetryAt: { $lte: now },
      })
        .populate("loanId")
        .populate("studentId");

      console.log(`Found ${retryEMIs.length} EMIs to retry`);

      for (const emi of retryEMIs) {
        await this.processEMI(emi);
      }
    } catch (error) {
      console.error("Error processing retries:", error);
    }
  }

  /**
   * Mark overdue EMIs
   */
  async markOverdueEMIs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all pending EMIs past their due date
      const result = await EMISchedule.updateMany(
        {
          status: "pending",
          dueDate: { $lt: today },
        },
        {
          $set: { status: "overdue" },
        }
      );

      console.log(`Marked ${result.modifiedCount} EMIs as overdue`);
    } catch (error) {
      console.error("Error marking overdue EMIs:", error);
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerNow() {
    console.log("Manually triggering EMI scheduler...");
    await this.processEMIs();
  }
}

// Export singleton instance
const emiScheduler = new EMIScheduler();
export default emiScheduler;