import mongoose from "mongoose";
import { dbOne } from "../../db.js";

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true }, // e.g., "Monthly Revenue", "Student Enrollment"
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileUrl: { type: String },
  },
  { timestamps: true }
);

export const Report = dbOne.model("Report", reportSchema);
