import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    // --- THE BRIDGE FIELD ---
    // Links this record to the actual login account in user.js
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // --- LINKED STUDENTS IMPROVEMENT ---
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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

    // --- KYC & ADDRESS DATA (From User Panel Uploads) ---
    kycData: {
      bankName: { type: String, default: "" },
      bankAccount: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      idType: { type: String, default: "National ID" },
      documentType: { type: String, default: "" }, // Added to store select value

      // File URLs
      // FIXED: Added missing fields so MongoDB doesn't delete them
      front: { type: String, default: null }, // Section 1 Front
      back: { type: String, default: null }, // Section 1 Back
      idFront: { type: String, default: null },
      idBack: { type: String, default: null },
      selfie: { type: String, default: null }, // Passport Photo
      passbook: { type: String, default: null },
      loa: { type: String, default: null },
      addressProofFile: { type: String, default: null },

      // Address Details
      addressState: { type: String, default: "" },
      addressCity: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      addressDocType: { type: String, default: "Bank Statement" },
      submittedAt: { type: Date },
    },

    // --- DIGITAL SIGNATURES ---
    documents: [
      {
        name: String,
        status: { type: String, default: "Uploaded" },
        fileUrl: String,
        fileType: String,
        signedAt: { type: Date, default: Date.now },
      },
    ],

    // --- APPLICATION DATA ---
    agency: { type: String, default: "" },
    uni: { type: String, default: "" },
    course: { type: String, default: "" },
    country: { type: String, default: "USA" },
    intake: { type: String, default: "" },
    duration: { type: String, default: "" },
    appId: { type: String, default: "" },

    // --- LOAN SPECIFIC DATA ---
    loanId: { type: String, default: "" },
    loanType: { type: String, default: "Education Loan" },
    requestedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    kycStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    loan: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    verificationNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

export const Student = mongoose.model("Student", studentSchema);
