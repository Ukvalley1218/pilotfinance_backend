import mongoose from "mongoose";

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
    version: { type: String, default: "v1.0" },
    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Archived"],
    },
    fileUrl: {
      type: String,
      required: [true, "File path is required"],
    },
  },
  { timestamps: true }
);

// Unified connection (No more dbOne.model)
export default mongoose.model("Document", documentSchema);
