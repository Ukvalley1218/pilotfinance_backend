import User from "../../models/User.js";
import { Student } from "../../models/student.model.js";

// --- 1. GET KYC STATUS & DATA ---
export const getKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "kycData kycStatus dob country state ssnPin phone",
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
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. HANDLE PERSONAL INFO (Step 1) ---
export const updatePersonalInfo = async (req, res) => {
  try {
    // UPDATED: Added phone, uni, course, and zipCode to match frontend PersonalInfo.jsx
    const {
      dob,
      country,
      state,
      phone,
      uni,
      course,
      zipCode,
      pin1,
      pin2,
      pin3,
    } = req.body;

    const fullPin = pin1 && pin2 && pin3 ? `${pin1}-${pin2}-${pin3}` : zipCode;

    const updateFields = {
      dob,
      country,
      state,
      phone, // Syncing phone to User Model
      kycStatus: "Pending",
    };
    if (fullPin) updateFields.ssnPin = fullPin;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true },
    ).select("-password");

    // SYNC TO STUDENT MODEL
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          kycStatus: "Pending",
          country: country,
          dob: dob,
          state: state,
          phone: phone, // FIX: Now saving phone from form
          uni: uni, // FIX: Now saving university from form
          course: course, // FIX: Now saving course from form
          name: updatedUser.fullName,
          email: updatedUser.email,
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
    console.error("Update Personal Info Error:", err);
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
      front: getPath("front"),
      back: getPath("back"),
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
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          kycData: updatedKycData,
          kycStatus: "Pending",
          name: user.fullName,
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
