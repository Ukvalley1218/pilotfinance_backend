import mongoose from "mongoose";

// We removed the dbOne import because we use the unified connection now

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

// We use mongoose.model instead of dbOne.model
const Fund = mongoose.model("Fund", fundSchema);

export { Fund };
