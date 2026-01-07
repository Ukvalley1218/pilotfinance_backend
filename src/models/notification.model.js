import mongoose from "mongoose";
import { dbOne } from "../../db.js";

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
  },
  { timestamps: true }
);

export const Notification = dbOne.model("Notification", notificationSchema);
