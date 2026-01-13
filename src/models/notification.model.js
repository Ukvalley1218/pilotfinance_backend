import mongoose from "mongoose";

// We removed the dbOne import because we use the unified connection now

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String }, // Optional: Link to the specific student/partner
    // PRO TIP: You might want to add a recipient field later to target specific users
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// We use the standard mongoose.model for the unified backend
export const Notification = mongoose.model("Notification", notificationSchema);
