import mongoose from "mongoose";

const commissionSettingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["percentage", "fixed", "both"],
      default: "percentage",
    },
    percentage: { type: Number, default: 0 },
    fixedAmount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CommissionSettings = mongoose.model(
  "CommissionSettings",
  commissionSettingsSchema
);

export default CommissionSettings;
