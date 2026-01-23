import mongoose from "mongoose";

const agreementSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, default: "Partner Service Agreement" },
    version: { type: String, default: "V1.2" },
    documentUrl: { type: String, required: true }, // URL to PDF (AWS S3 or Local)

    // Tracking Steps
    status: {
      type: String,
      enum: [
        "Uploaded",
        "Reviewing",
        "Signed_By_Partner",
        "Signed_By_Admin",
        "Completed",
      ],
      default: "Uploaded",
    },

    partnerSignedAt: Date,
    adminSignedAt: Date,
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Agreement =
  mongoose.models.Agreement || mongoose.model("Agreement", agreementSchema);
export default Agreement;
