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
    // This field identifies which Partner "owns" this student/lead.
    // When a partner links a user from the pool, this ID is set to that Partner's User ID.
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
      // File URLs
      idFront: { type: String, default: null },
      idBack: { type: String, default: null },
      passbook: { type: String, default: null },
      loa: { type: String, default: null },
      addressProofFile: { type: String, default: null },
      // Address Details
      addressState: { type: String, default: "" },
      addressCity: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      addressDocType: { type: String, default: "Bank Statement" },
    },

    // --- DIGITAL SIGNATURES (From Signature Page) ---
    // Stores history of all signed documents for this specific application
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
