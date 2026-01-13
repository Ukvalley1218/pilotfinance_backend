import User from "../../models/User.js";

// --- 1. GET KYC STATUS & DATA ---
// @route   GET /api/user/kyc/status
export const getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "kycData kycStatus dob country state ssnPin"
    );
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    res.status(200).json({
      success: true,
      status: user.kycStatus,
      // Flatten the data for the frontend to consume easily
      data: {
        ...(user.kycData || {}),
        dob: user.dob,
        country: user.country,
        state: user.state,
        ssnPin: user.ssnPin,
      },
    });
  } catch (err) {
    console.error("Fetch KYC Error:", err.message);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. HANDLE PERSONAL INFO (Step 1) ---
export const updatePersonalInfo = async (req, res) => {
  try {
    const { dob, country, state, pin1, pin2, pin3 } = req.body;
    const fullPin = pin1 && pin2 && pin3 ? `${pin1}${pin2}${pin3}` : undefined;

    const updateFields = { dob, country, state };
    if (fullPin) updateFields.ssnPin = fullPin;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true }
    );

    res.status(200).json({
      success: true,
      msg: "Personal Information saved",
      data: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ msg: "Server Error during personal info update" });
  }
};

// --- 3. HANDLE DOCUMENTS & BANK DETAILS (Step 2) ---
export const submitKycDocuments = async (req, res) => {
  try {
    const { bankAccount, bankName, ifscCode, idType, documentType } = req.body;
    const files = req.files; // Populated by multer .fields()

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Initialize or get existing kycData
    const currentKycData = user.kycData || {};

    // Helper to get new path or retain existing one
    const getPath = (fieldname) =>
      files && files[fieldname]
        ? `/uploads/kyc/${files[fieldname][0].filename}`
        : currentKycData[fieldname];

    const updatedKycData = {
      ...currentKycData,
      documentType,
      bankAccount,
      bankName,
      ifscCode,
      idType,
      // Mapping fields matching your Kyc.jsx state
      front: getPath("front"),
      back: getPath("back"),
      loa: getPath("loa"),
      passbook: getPath("passbook"),
      idFront: getPath("idFront"),
      idBack: getPath("idBack"),
      selfie: getPath("selfie"),
      submittedAt: Date.now(),
    };

    user.kycData = updatedKycData;
    user.kycStatus = "Pending";
    await user.save();

    res.status(200).json({
      success: true,
      msg: "KYC Details saved successfully!",
      data: updatedKycData,
    });
  } catch (err) {
    console.error("KYC Step 2 Error:", err.message);
    res.status(500).json({ msg: "Server Error during document upload" });
  }
};

// --- 4. HANDLE ADDRESS PROOF (Step 3) ---
export const submitAddressProof = async (req, res) => {
  try {
    const { state, city, postalCode, docType } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.kycData) user.kycData = {};

    user.kycData.addressState = state;
    user.kycData.addressCity = city;
    user.kycData.postalCode = postalCode;
    user.kycData.addressDocType = docType;

    if (req.file) {
      user.kycData.addressProofFile = `/uploads/kyc/${req.file.filename}`;
    }

    user.kycStatus = "Pending";
    await user.save();

    res.status(200).json({
      success: true,
      msg: "Address verification submitted!",
    });
  } catch (err) {
    res.status(500).json({ msg: "Server Error during address proof" });
  }
};
