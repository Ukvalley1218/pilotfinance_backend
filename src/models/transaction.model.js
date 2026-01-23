import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Compatible with Admin "id" (TXN-1001) and Wallet "txnId"
    id: {
      type: String,
      required: true,
      unique: true,
    },
    // The Owner of the transaction (Partner, Admin, or Student)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Dynamic values for Wallet Icons
    type: {
      type: String,
      enum: ["Credit", "Debit"], // Capitalized to match your Admin logic
      required: true,
    },
    // "desc" is used for Admin, "title" for Wallet (we will use desc for both)
    desc: {
      type: String,
      required: true,
    },
    subDesc: {
      type: String, // Used for extra details or student names
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
  { timestamps: true }
);

// --- THE FIX: PREVENT OVERWRITE ERROR ---
// This checks if the model already exists before trying to compile it again.
const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

export default Transaction;
