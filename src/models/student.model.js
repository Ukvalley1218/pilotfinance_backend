import mongoose from "mongoose";
// 1. UPDATED: Import dbOne from db.js (root) instead of server.js
import { dbOne } from "../../db.js";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    agency: {
      type: String,
      default: "",
    },
    uni: {
      type: String,
      default: "",
    },
    course: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "USA",
    },
    intake: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "",
    },
    appId: {
      type: String,
      default: "",
    },
    loanId: {
      type: String,
      default: "",
    },
    loanType: {
      type: String,
      default: "Education Loan",
    },
    requestedAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    loan: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
  },
  {
    timestamps: true,
  }
);

// 2. Attach the schema to the centralized database instance exported from db.js
export const Student = dbOne.model("Student", studentSchema);
