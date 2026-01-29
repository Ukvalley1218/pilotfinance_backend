import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
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
      unique: true,
    },
    country: {
      type: String,
      default: "Canada",
    },
    status: {
      type: String,
      // Status remains a String but without strict enum enforcement to prevent crashes
      default: "Active",
    },
    gender: {
      type: String,
      default: "Male",
    },
    dob: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    businessName: {
      type: String,
      default: "",
    },
    businessType: {
      type: String,
      // Removed strict enum - will now accept any string from frontend
      default: "Agency",
    },
    regNumber: {
      type: String,
      default: "",
    },
    gstId: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    idProofType: {
      type: String,
      // Removed strict enum - will now accept any string from frontend
      default: "Passport",
    },
    idProofNumber: {
      type: String,
      default: "",
    },
    planType: {
      type: String,
      // Removed strict enum
      default: "Yearly",
    },
    feeAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Partner = mongoose.model("Partner", partnerSchema);
