import Document from "../../models/document.model.js"; // Removed curly braces
import { Notification } from "../../models/notification.model.js"; // Path for your unified folder
import fs from "fs";
import path from "path";

/**
 * @desc Get all documents with category filtering
 */
export const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Fetch Documents Error:", error);
    res.status(500).json({
      success: false,
      message: "Server failed to sync documents from database",
    });
  }
};

/**
 * @desc Handle File Upload and Metadata Saving
 */
export const uploadDocument = async (req, res) => {
  try {
    const { name, category, version, status } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file detected. Please select a document to upload.",
      });
    }

    // Your important category check - RESTORED
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required for upload.",
      });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const newDoc = await Document.create({
      name: name || req.file.originalname,
      category,
      version: version || "v1.0",
      status: status || "Active",
      fileUrl,
    });

    // Your specific notification link - RESTORED
    await Notification.create({
      type: "success",
      message: `New Document Uploaded: ${newDoc.name}`,
      link: `/admin/digital-documents`,
    });

    res.status(201).json({
      success: true,
      message: "Document successfully synced to storage",
      data: newDoc,
    });
  } catch (error) {
    console.error("Upload Controller Error:", error);
    res.status(500).json({
      success: false,
      message: "Database sync failed: " + error.message,
    });
  }
};

/**
 * @desc Update Document Metadata (Handles file replacement cleanup)
 */
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, version, status } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    // File replacement logic - RESTORED
    if (req.file) {
      const oldFilePath = path.join(process.cwd(), document.fileUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      document.fileUrl = `/uploads/documents/${req.file.filename}`;
    }

    document.name = name || document.name;
    document.version = version || document.version;
    document.status = status || document.status;

    const updatedDoc = await document.save();

    // Your specific notification link - RESTORED
    await Notification.create({
      type: "info",
      message: `Document Modified: ${updatedDoc.name}`,
      link: `/admin/digital-documents`,
    });

    res.status(200).json({
      success: true,
      message: "Document metadata updated successfully",
      data: updatedDoc,
    });
  } catch (error) {
    console.error("Update Document Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update document" });
  }
};

/**
 * @desc Delete Document record and cleanup physical file
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    // Physical file deletion - RESTORED
    if (doc.fileUrl) {
      const filePath = path.join(process.cwd(), doc.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Document.findByIdAndDelete(id);

    // Your specific notification link - RESTORED
    await Notification.create({
      type: "warning",
      message: `Document Deleted: ${doc.name}`,
      link: `/admin/digital-documents`,
    });

    res.status(200).json({
      success: true,
      message: "Document and physical file removed successfully",
    });
  } catch (error) {
    console.error("Delete operation failed:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during deletion",
    });
  }
};
