import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    loanId: {
      type: String,
      required: true,
      unique: true, // LN-12456
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
      type: Number, // 9.5
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

export const Loan = mongoose.model("Loan", loanSchema);
