import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["percentage", "fixed", "both"],
      default: "percentage",
    },
    percentage: { type: Number, default: 0 },
    fixedAmount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    partnerregistrationfee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Settings = mongoose.model(
  "Settings",
  SettingsSchema
);

export default Settings;
