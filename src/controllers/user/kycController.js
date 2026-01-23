import User from "../../models/User.js";
import { Student } from "../../models/student.model.js";

// --- 1. GET KYC STATUS & DATA ---
export const getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "kycData kycStatus dob country state ssnPin",
    );
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    res.status(200).json({
      success: true,
      status: user.kycStatus,
      data: {
        ...(user.kycData || {}),
        dob: user.dob,
        country: user.country,
        state: user.state,
        ssnPin: user.ssnPin,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. HANDLE PERSONAL INFO (Step 1) ---
export const updatePersonalInfo = async (req, res) => {
  try {
    const { dob, country, state, pin1, pin2, pin3 } = req.body;
    const fullPin =
      pin1 && pin2 && pin3 ? `${pin1}-${pin2}-${pin3}` : undefined;

    const updateFields = {
      dob,
      country,
      state,
      kycStatus: "Pending",
    };
    if (fullPin) updateFields.ssnPin = fullPin;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true },
    ).select("-password");

    // SYNC TO STUDENT MODEL
    // Added upsert: true to ensure the record is created if it doesn't exist
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          kycStatus: "Pending",
          country: country,
          dob: dob,
          state: state,
        },
      },
      { upsert: true, new: true },
    );

    res.status(200).json({
      success: true,
      msg: "Personal Info saved & synced",
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
    const files = req.files;

    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const currentKycData = user.kycData || {};

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
      idFront: getPath("idFront"),
      idBack: getPath("idBack"),
      selfie: getPath("selfie"),
      passbook: getPath("passbook"),
      loa: getPath("loa"),
      submittedAt: Date.now(),
    };

    // Update User Model
    user.kycData = updatedKycData;
    user.kycStatus = "Pending";
    await user.save();

    // --- SYNC TO STUDENT MODEL (Admin visibility) ---
    // Using upsert: true ensures the Admin can see the record even if it's the first time data is saved
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          kycData: updatedKycData,
          kycStatus: "Pending",
          name: user.fullName, // Ensure name is synced for Admin list
          email: user.email,
        },
      },
      { upsert: true, new: true },
    );

    res.status(200).json({
      success: true,
      msg: "KYC Details synced to Admin",
      data: updatedKycData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error during document upload" });
  }
};

// --- 4. HANDLE ADDRESS PROOF (Step 3) ---
export const submitAddressProof = async (req, res) => {
  try {
    const { state, city, postalCode, docType } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const currentKyc = user.kycData || {};

    const addressProofFile = req.file
      ? `/uploads/kyc/${req.file.filename}`
      : currentKyc.addressProofFile;

    const updatedKycData = {
      ...currentKyc,
      addressState: state,
      addressCity: city,
      postalCode: postalCode,
      addressDocType: docType,
      addressProofFile: addressProofFile,
    };

    // Update User Model
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        kycData: updatedKycData,
        kycStatus: "Pending",
      },
    });

    // --- SYNC TO STUDENT MODEL (Admin visibility) ---
    // Force set the kycStatus and kycData object
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          kycData: updatedKycData,
          kycStatus: "Pending",
        },
      },
      { upsert: true, new: true },
    );

    res
      .status(200)
      .json({ success: true, msg: "Address proof synced to Admin" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error during address proof" });
  }
};
