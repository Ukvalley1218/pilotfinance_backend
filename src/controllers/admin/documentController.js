import Document from "../../models/document.model.js"; // Removed curly braces
import { Notification } from "../../models/notification.model.js"; // Path for your unified folder
import fs from "fs";
import path from "path";
import cloudinary from "../../services/cloudinary.service.js";

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

    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    if (!category)
      return res.status(400).json({ success: false, message: "Category is required" });

    const newDoc = await Document.create({
      name: name || req.file.originalname,
      category,
      version: version || "v1.0",
      status: status || "Active",
      fileUrl: req.file.path, // 🌩 Cloudinary URL
      publicId: req.file.filename, // Save for deletion
    });

    await Notification.create({
      type: "success",
      message: `New Document Uploaded: ${newDoc.name}`,
      link: `/admin/digital-documents`,
    });

    res.status(201).json({ success: true, data: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc Update Document Metadata (Handles file replacement cleanup)
 */
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);
    if (!document) return res.status(404).json({ success: false, message: "Not found" });

    if (req.file) {
      // Delete old file from Cloudinary
      if (document.publicId) {
        await cloudinary.uploader.destroy(document.publicId, { resource_type: "raw" });
      }

      document.fileUrl = req.file.path;
      document.publicId = req.file.filename;
    }

    document.name = req.body.name || document.name;
    document.version = req.body.version || document.version;
    document.status = req.body.status || document.status;

    const updated = await document.save();

    await Notification.create({
      type: "info",
      message: `Document Modified: ${updated.name}`,
      link: `/admin/digital-documents`,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};


/**
 * @desc Delete Document record and cleanup physical file
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    if (doc.publicId) {
      await cloudinary.uploader.destroy(doc.publicId, { resource_type: "raw" });
    }

    await Document.findByIdAndDelete(id);

    await Notification.create({
      type: "warning",
      message: `Document Deleted: ${doc.name}`,
      link: `/admin/digital-documents`,
    });

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Deletion failed" });
  }
};

