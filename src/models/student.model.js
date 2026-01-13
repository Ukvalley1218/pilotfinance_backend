import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    // --- THE BRIDGE FIELD ---
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Links to the Master User Model
      required: false, // Optional because an Admin might manually create a student
    },
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
    // --- APPLICATION DATA ---
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
    // --- LOAN SPECIFIC DATA ---
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

export const Student = mongoose.model("Student", studentSchema);
