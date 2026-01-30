import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Compatible with Admin "id" (TXN-1001) and Wallet "txnId"
    id: {
      type: String,
      required: true,
      unique: true,
    },
    // The Owner of the transaction (Recruiter, Admin, or Student)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // --- THE CRITICAL FIX FOR MULTI-LOAN USERS ---
    // This links the payment to a specific Loan Application ID
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false, // Optional for general wallet txns, required for loan repayments
    },
    // Dynamic values for Wallet Icons
    type: {
      type: String,
      enum: ["Credit", "Debit"],
      required: true,
    },
    // Description for UI
    desc: {
      type: String,
      required: true,
    },
    subDesc: {
      type: String, // Used for extra details, student names, or Loan Ref IDs
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Completed", "Pending", "Failed"],
      default: "Completed",
    },
  },
  { timestamps: true },
);

// Virtual for UI sync (Wallet Dashboard expects 'title' and 'txnId')
transactionSchema.virtual("title").get(function () {
  return this.desc;
});

transactionSchema.virtual("txnId").get(function () {
  return this.id;
});

transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

// Prevent overwrite error
const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

export default Transaction;
