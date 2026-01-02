import mongoose from "mongoose";
// 1. UPDATED: Import dbOne from db.js instead of server.js
import { dbOne } from "../../db.js";

const loanSchema = new mongoose.Schema(
  {
    loanId: {
      type: String,
      required: true,
      unique: true, // e.g., LN-12456
      trim: true,
    },
    type: {
      type: String,
      default: "Education Loan",
    },
    requestedAmount: {
      type: Number,
      required: true,
    },
    approvedAmount: {
      type: Number,
      default: 0,
    },
    interestRate: {
      type: Number, // e.g., 9.5
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Disbursed"],
      default: "Pending",
    },
    approvedBy: {
      type: String,
      default: "",
    },
    approvedBySub: {
      type: String,
      default: "",
    },
    disbursementDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 2. Attach the schema to the correct database instance exported from db.js
export const Loan = dbOne.model("Loan", loanSchema);
