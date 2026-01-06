import mongoose from "mongoose";
import { dbOne } from "../../db.js";

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Document name is mandatory"],
    },
    category: {
      type: String,
      required: [true, "Category is mandatory"],
      enum: [
        "Partner Documents",
        "Student Documents",
        "Loan Forms & Templates",
        "General Uploads / Resources",
      ],
    },
    version: {
      type: String,
      default: "v1.0",
    },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Archived"], // Prevents invalid status strings
    },
    fileUrl: {
      type: String,
      required: [true, "File path is required for database sync"],
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

// This ensures the model uses the correct database cluster (database_one)
export const Document = dbOne.model("Document", documentSchema);
