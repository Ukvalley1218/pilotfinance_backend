import mongoose from "mongoose";
import { dbOne } from "../../db.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // --- NEW FIELDS FOR SETTINGS PAGE ---
    contact: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["Super Admin", "Admin", "Editor"],
      default: "Admin",
    },
    // Persistent Preferences for UI and Notifications
    preferences: {
      twoFactor: { type: Boolean, default: false },
      loanUpdates: { type: Boolean, default: true },
      partnerMessages: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: false },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      language: { type: String, default: "English" },
      dashboardView: { type: String, default: "Dashboard" },
    },
  },
  { timestamps: true }
);

// Attach the schema to the correct database instance exported from db.js
export const User = dbOne.model("User", userSchema);
