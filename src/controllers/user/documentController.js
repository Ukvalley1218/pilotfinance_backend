import { Student } from "../../models/student.model.js";
import cloudinary from "../../services/cloudinary.service.js";

// --- 1. FETCH ALL SAVED DOCUMENTS ---
export const getUserDocuments = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("documents");

    if (!student || !student.documents.length) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    res.status(200).json({
      success: true,
      data: { documents: student.documents },
    });
  } catch (err) {
    console.error("Fetch Documents Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. UPLOAD & PERSIST DOCUMENT ---
export const uploadDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const index = parseInt(docId) - 1;

    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file provided" });
    }

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    // Initialize slots if first time
    if (!student.documents || student.documents.length === 0) {
      student.documents = [
        { name: "Loan Application Agreement" },
        { name: "KYC Declaration Form" },
        { name: "Consent for Credit Check (Canada)" },
        { name: "POF Verification Declaration" },
        { name: "Tuition Fee Guarantee Agreement" },
        { name: "Recruitment Partner Consent Form" },
      ];
    }

    if (!student.documents[index]) {
      return res.status(404).json({ success: false, msg: "Invalid document slot" });
    }

    student.documents[index].status = "Uploaded";
    student.documents[index].fileUrl = req.file.path;
    student.documents[index].fileType = req.file.mimetype;
    student.documents[index].uploadedAt = new Date();

    await student.save();

    res.status(200).json({
      success: true,
      msg: "Document uploaded successfully",
      data: student.documents,
    });
  } catch (err) {
    console.error("Document Upload Error:", err);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};


// --- 3. DELETE/RESET DOCUMENT (The fix for your crash) ---
/**
 * @desc    Reset a specific document slot back to "Sign Now"
 * @route   DELETE /api/signatures/delete/:docId
 * @access  Private
 */
export const deleteSignature = async (req, res) => {
  try {
    const { docId } = req.params;
    const index = parseInt(docId) - 1;

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    if (student.documents[index]) {
      student.documents[index].status = "Sign Now";
      student.documents[index].fileUrl = null;
      student.documents[index].fileType = null;
      student.documents[index].uploadedAt = null;

      await student.save();

      return res.status(200).json({
        success: true,
        msg: "File removed and reset",
        data: student.documents,
      });
    }

    res.status(404).json({ success: false, msg: "Document slot not found" });
  } catch (err) {
    console.error("Delete Signature Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 4. ADMIN: FETCH ALL SIGNATURES ---
export const getAllSignaturesAdmin = async (req, res) => {
  try {
    const students = await Student.find({ "documents.fileUrl": { $exists: true } })
      .select("name email documents");

    res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error("Admin Fetch Signatures Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

