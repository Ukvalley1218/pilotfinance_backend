import UserDocuments from "../../models/UserDocuments.js";

// --- 1. FETCH ALL SAVED DOCUMENTS ---
export const getUserDocuments = async (req, res) => {
  try {
    const data = await UserDocuments.findOne({ userId: req.user.id });

    if (!data) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    // Professional touch: Map any old "Pending" statuses to "Sign Now"
    // so the Frontend UI buttons look correct.
    const mappedDocs = data.documents.map((doc) => ({
      ...doc.toObject(),
      status: doc.status === "Pending" ? "Sign Now" : doc.status,
    }));

    res.status(200).json({
      success: true,
      data: { ...data.toObject(), documents: mappedDocs },
    });
  } catch (err) {
    console.error("Fetch Documents Error:", err); // Restored your log
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

    // Initial setup if this is the user's first upload
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
      // Before saving, ensure any other "Pending" docs are updated to "Sign Now"
      // to avoid triggering the Mongoose Enum ValidationError on .save()
      userDocs.documents.forEach((doc, i) => {
        if (doc.status === "Pending") {
          doc.status = "Sign Now";
        }
      });

      // Update the target document
      userDocs.documents[index].status = "Uploaded";
      // Updated path to reflect the unified structure
      userDocs.documents[index].fileUrl = `/uploads/kyc/${req.file.filename}`;
      userDocs.documents[index].fileType = req.file.mimetype;
      userDocs.documents[index].uploadedAt = Date.now();

      await userDocs.save();

      return res.status(200).json({
        success: true,
        msg: "Document synchronized successfully", // Your original msg
        data: userDocs,
      });
    }

    res.status(404).json({ success: false, msg: "Invalid document slot" });
  } catch (err) {
    console.error("Document Upload Error:", err); // Restored your log

    // If it's a validation error, provide specific feedback - RESTORED
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        msg: "Data format error. Please contact support.",
      });
    }
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};
