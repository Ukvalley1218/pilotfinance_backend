import UserDocuments from "../../models/UserDocuments.js";

// --- 1. FETCH ALL SAVED DOCUMENTS ---
export const getUserDocuments = async (req, res) => {
  try {
    const data = await UserDocuments.findOne({ userId: req.user.id });

    if (!data) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    const mappedDocs = data.documents.map((doc) => ({
      ...doc.toObject(),
      status: doc.status === "Pending" ? "Sign Now" : doc.status,
    }));

    res.status(200).json({
      success: true,
      data: { ...data.toObject(), documents: mappedDocs },
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
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file provided" });
    }

    let userDocs = await UserDocuments.findOne({ userId });

    if (!userDocs) {
      userDocs = new UserDocuments({
        userId,
        documents: [
          { name: "Loan Application Agreement", status: "Sign Now" },
          { name: "KYC Declaration Form", status: "Sign Now" },
          { name: "Consent for Credit Check (Canada)", status: "Sign Now" },
          { name: "POF Verification Declaration", status: "Sign Now" },
          { name: "Tuition Fee Guarantee Agreement", status: "Sign Now" },
          { name: "Recruitment Partner Consent Form", status: "Sign Now" },
        ],
      });
    }

    const index = parseInt(docId) - 1;

    if (userDocs.documents[index]) {
      userDocs.documents.forEach((doc) => {
        if (doc.status === "Pending") {
          doc.status = "Sign Now";
        }
      });

      userDocs.documents[index].status = "Uploaded";
      const folder = req.file.filename.startsWith("SIG") ? "signatures" : "kyc";

      userDocs.documents[index].fileUrl =
        `/uploads/${folder}/${req.file.filename}`;
      userDocs.documents[index].fileType = req.file.mimetype;
      userDocs.documents[index].uploadedAt = Date.now();

      await userDocs.save();

      return res.status(200).json({
        success: true,
        msg: "Document synchronized successfully",
        data: userDocs,
      });
    }

    res.status(404).json({ success: false, msg: "Invalid document slot" });
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
    const userId = req.user.id;

    const userDocs = await UserDocuments.findOne({ userId });

    if (!userDocs) {
      return res
        .status(404)
        .json({ success: false, msg: "No documents found" });
    }

    // Since docId is 1-6, and array index is 0-5
    const index = parseInt(docId) - 1;

    if (userDocs.documents[index]) {
      // RESET the specific document slot instead of removing it from array
      // This maintains the order of your 6 required documents
      userDocs.documents[index].status = "Sign Now";
      userDocs.documents[index].fileUrl = null;
      userDocs.documents[index].fileType = null;
      userDocs.documents[index].uploadedAt = null;

      await userDocs.save();

      return res.status(200).json({
        success: true,
        msg: "File removed and status reset",
        data: userDocs,
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
    const allDocs = await UserDocuments.find()
      .populate("userId", "fullName email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: allDocs,
    });
  } catch (err) {
    console.error("Admin Fetch Signatures Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};
