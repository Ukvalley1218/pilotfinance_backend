import mongoose from "mongoose";

const UserDocumentsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    documents: [
      {
        name: { type: String, required: true },
        status: {
          type: String,
          enum: ["Sign Now", "Uploaded", "Pending", "Verified", "Rejected"],
          default: "Sign Now",
        },
        fileUrl: { type: String, default: null },
        fileType: { type: String, default: null },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isFinalSubmitted: { type: Boolean, default: false },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("UserDocuments", UserDocumentsSchema);
