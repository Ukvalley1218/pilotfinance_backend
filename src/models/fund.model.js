import mongoose from "mongoose";
import { dbOne } from "../../db.js";

const fundSchema = new mongoose.Schema(
  {
    source: { type: String, required: true }, // e.g., "Equity", "Bank Loan"
    amount: { type: Number, required: true },
    allocatedTo: { type: String, default: "General Pool" },
    status: {
      type: String,
      enum: ["Available", "Disbursed", "Reserved"],
      default: "Available",
    },
    description: { type: String },
  },
  { timestamps: true }
);

export const Fund = dbOne.model("Fund", fundSchema);
