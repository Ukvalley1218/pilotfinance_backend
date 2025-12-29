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
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
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
      enum: ["Agency", "Individual", "Company"],
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
      default: "Driver’s License",
    },
    idProofNumber: {
      type: String,
      default: "",
    },
    planType: {
      type: String,
      enum: ["Monthly", "Yearly"],
      default: "Yearly",
    },
    feeAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Partner = mongoose.model("Partner", partnerSchema);
