import mongoose from "mongoose";
import { dbOne } from "../../db.js";

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g., TXN-1001
    type: { type: String, enum: ["Credit", "Debit"], required: true },
    desc: { type: String, required: true },
    subDesc: { type: String },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Completed", "Pending"],
      default: "Completed",
    },
  },
  { timestamps: true }
);

export const Transaction = dbOne.model("Transaction", transactionSchema);
