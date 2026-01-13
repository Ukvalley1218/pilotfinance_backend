import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // --- CORE IDENTITY (Shared) ---
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },

    // --- ADMIN SPECIFIC FIELDS ---
    role: {
      type: String,
      enum: ["Super Admin", "Admin", "Editor", "User"], // Added 'User' to the enum
      default: "User",
    },
    preferences: {
      twoFactor: { type: Boolean, default: false },
      loanUpdates: { type: Boolean, default: true },
      partnerMessages: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: false },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      language: { type: String, default: "English" },
      dashboardView: { type: String, default: "Dashboard" },
    },

    // --- USER PANEL: AUTH & SECURITY ---
    otpCode: { type: String },
    otpExpires: { type: Date },
    isPhoneVerified: { type: Boolean, default: false },
    ssnPin: { type: String },

    // --- USER PANEL: PROFILE DATA ---
    phone: { type: String, trim: true }, // Admin's 'contact' is now 'phone'
    alternateNumber: { type: String },
    dob: { type: String },
    country: { type: String, default: "Canada" },
    state: { type: String },
    address: { type: String },
    education: { type: String },
    gender: { type: String },
    maritalStatus: { type: String },
    avatar: { type: String, default: "" },

    // --- USER PANEL: KYC DATA ---
    kycData: {
      documentType: { type: String },
      bankAccount: { type: String },
      bankName: { type: String },
      ifscCode: { type: String },
      idType: { type: String },
      addressState: { type: String },
      addressCity: { type: String },
      postalCode: { type: String },
      addressDocType: { type: String },
      addressProofFile: { type: String },
      front: { type: String },
      back: { type: String },
      loa: { type: String },
      passbook: { type: String },
      idFront: { type: String },
      idBack: { type: String },
      selfie: { type: String },
      submittedAt: { type: Date, default: Date.now },
    },

    // --- SYSTEM STATUS ---
    kycStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// --- PASSWORD ENCRYPTION ---
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Exporting as default for the unified project
const User = mongoose.model("User", userSchema);
export default User;
