import mongoose from "mongoose";

// Removed dbOne import - using unified connection from src/db.js

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    }, // e.g., "Monthly Revenue", "Student Enrollment"
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Points to the unified User model
    },
    fileUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

// Changed from dbOne.model to mongoose.model
export const Report = mongoose.model("Report", reportSchema);
