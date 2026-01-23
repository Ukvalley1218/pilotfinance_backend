import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true }, // e.g., "Added Student", "Updated Profile"
    details: { type: String }, // e.g., "Referred student: John Doe"
    category: {
      type: String,
      enum: ["Student", "Profile", "Wallet", "Document", "System"],
      default: "System",
    },
    ipAddress: String,
  },
  { timestamps: true },
);

const Activity =
  mongoose.models.Activity || mongoose.model("Activity", activitySchema);
export default Activity;
