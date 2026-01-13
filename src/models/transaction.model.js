import mongoose from "mongoose";

// Removed dbOne import - using unified connection from src/db.js

const transactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    }, // e.g., TXN-1001
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }, // Pro-tip: Linking transaction to a specific User
    type: {
      type: String,
      enum: ["Credit", "Debit"],
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    subDesc: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Completed", "Pending"],
      default: "Completed",
    },
  },
  { timestamps: true }
);

// Changed from dbOne.model to mongoose.model
export const Transaction = mongoose.model("Transaction", transactionSchema);
