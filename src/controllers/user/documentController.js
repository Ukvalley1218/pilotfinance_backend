import UserDocuments from "../../models/UserDocuments.js";

// --- 1. FETCH ALL SAVED DOCUMENTS ---
export const getUserDocuments = async (req, res) => {
  try {
    const data = await UserDocuments.findOne({ userId: req.user.id });

    if (!data) {
      return res.status(200).json({ success: true, data: { documents: [] } });
    }

    // Map any old "Pending" statuses to "Sign Now" for Frontend UI consistency
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
      // Clean up statuses to avoid Mongoose Enum ValidationErrors on save
      userDocs.documents.forEach((doc) => {
        if (doc.status === "Pending") {
          doc.status = "Sign Now";
        }
      });

      // Update the target document
      userDocs.documents[index].status = "Uploaded";

      /**
       * VITAL: This path must match the folder structure set in your
       * uploadMiddleware destination and your express.static config.
       */
      userDocs.documents[index].fileUrl = `/uploads/kyc/${req.file.filename}`;
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

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        msg: "Data format error. Please check your document statuses.",
      });
    }
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};
