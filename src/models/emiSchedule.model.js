import mongoose from "mongoose";

const emiScheduleSchema = new mongoose.Schema(
  {
    // Reference to Loan
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
    },
    // Reference to Student
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    // Installment number (1, 2, 3, etc.)
    installmentNumber: {
      type: Number,
      required: true,
    },
    // EMI amount to be paid
    amount: {
      type: Number,
      required: true,
    },
    // Due date for this installment
    dueDate: {
      type: Date,
      required: true,
    },
    // Payment status
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "overdue", "cancelled"],
      default: "pending",
    },
    // Retry count for failed auto-debit attempts
    retryCount: {
      type: Number,
      default: 0,
    },
    // Maximum retry attempts allowed
    maxRetries: {
      type: Number,
      default: 3,
    },
    // Date when payment was made
    paidAt: {
      type: Date,
    },
    // Reference to Transaction record
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    // Stripe Payment Intent ID (for auto-debit)
    stripePaymentIntentId: {
      type: String,
    },
    // Payment method used (if auto-debit)
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
    },
    // Late payment fee (if applicable)
    lateFee: {
      type: Number,
      default: 0,
    },
    // Total amount including late fee
    totalAmount: {
      type: Number,
    },
    // Notes (for failed payments, etc.)
    notes: {
      type: String,
      default: "",
    },
    // Last retry attempt date
    lastRetryAt: {
      type: Date,
    },
    // Next scheduled retry date
    nextRetryAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
emiScheduleSchema.index({ loanId: 1, installmentNumber: 1 });
emiScheduleSchema.index({ studentId: 1, status: 1 });
emiScheduleSchema.index({ dueDate: 1, status: 1 });

// Virtual for checking if payment is overdue
emiScheduleSchema.virtual("isOverdue").get(function () {
  if (this.status === "paid") return false;
  return new Date() > this.dueDate;
});

// Virtual for days overdue
emiScheduleSchema.virtual("daysOverdue").get(function () {
  if (this.status === "paid") return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = today - dueDate;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

emiScheduleSchema.set("toJSON", { virtuals: true });
emiScheduleSchema.set("toObject", { virtuals: true });

const EMISchedule =
  mongoose.models.EMISchedule ||
  mongoose.model("EMISchedule", emiScheduleSchema);

export default EMISchedule;