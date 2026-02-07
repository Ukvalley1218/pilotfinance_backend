import mongoose from "mongoose";
import bcrypt from "bcryptjs";


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
        unique: true,   // ✅ ADD THIS
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    education: {
      type: String,
    },
    maritalStatus: {
      type: String,
    },
    dob: {
      type: Date,
    },
    gender: {
  type: String,
  enum: ["Male", "Female", "Other"],
},
    
    password: { type: String, required: true, minlength: 6 },
    isEmailVerified: { type: Boolean, default: false },
    // ✅ ADD THESE
otpCode: { type: String },
otpExpires: { type: Date },

    kycProfile: {
      bankAccount: { type: String, default: "" },
      bankName: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      idType: { type: String, default: "" },
      documentType: { type: String, default: "" },
      submittedAt: Date,
      addressState: { type: String, default: "" },
      addressCity: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      addressDocType: { type: String, default: "Bank Statement" },
    },

    // --- KYC & ADDRESS DATA (From User Panel Uploads) ---
    kycData: {
      // File URLs
      // FIXED: Added missing fields so MongoDB doesn't delete them
      front: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      back: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      idFront: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      idBack: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      selfie: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      passbook: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      loa: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
      addressProof: {
        url: String,
        status: { type: String, default: "Pending" },
        remark: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },

      // Address Details
    },

    // --- DIGITAL SIGNATURES ---
    documents: [
  {
    name: String,
    status: {
      type: String,
      enum: ["Sign Now", "Uploaded", "Signed"],
      default: "Sign Now",
    },
    fileUrl: String,
    fileType: String,
    uploadedAt: Date,
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
    avatar:{type:String,default:""},

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
      enum: ["Not Submitted", "Pending", "Partially Verified", "Verified"],
      default: "Not Submitted",
    },
    loan: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    verificationNotes: { type: String, default: "" },
    verificationDate: { type: Date },
  },
  {
    timestamps: true,
  },
);
studentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password during login
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Student = mongoose.model("Student", studentSchema);
