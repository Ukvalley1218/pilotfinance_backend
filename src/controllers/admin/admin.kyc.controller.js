import User from "../../models/User.js";
import fs from "fs";
import path from "path";

/**
 * GET STUDENT KYC USERS
 */
export const getStudentKyc = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["student"] },
      "kycData.selfie": { $ne: null },
    }).select("-password");

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET PARTNER KYC USERS
 */
export const getPartnerKyc = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["Partner"] },
      "kycData.selfie": { $ne: null },
    }).select("-password");

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE SPECIFIC KYC FILE
 * Example: /kyc/USERID/selfie
 */
export const deleteKycFile = async (req, res) => {
  try {
    const { userId, field } = req.params;

    const allowedFields = [
      "front",
      "back",
      "loa",
      "passbook",
      "idFront",
      "idBack",
      "selfie",
      "addressProofFile",
    ];

    if (!allowedFields.includes(field)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid document field" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const filePath = user.kycData[field];
    if (filePath) {
      const fullPath = path.join("uploads", filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    user.kycData[field] = null;
    await user.save();

    res.json({ success: true, message: `${field} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * EXPORT KYC DATA AS CSV
 */
export const exportKycCsv = async (req, res) => {
  try {
    const users = await User.find({
      "kycData.selfie": { $ne: null },
    });

    let csv =
      "Name,Email,Role,Phone,Bank Name,Account,IFSC,Status\n";

    users.forEach((u) => {
      csv += `${u.fullName},${u.email},${u.role},${u.phone || ""},${
        u.kycData.bankName || ""
      },${u.kycData.bankAccount || ""},${u.kycData.ifscCode || ""},${u.kycStatus}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("kyc_export.csv");
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};