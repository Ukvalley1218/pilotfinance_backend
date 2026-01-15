import User from "../../models/User.js";
import { generateToken } from "../../utils/generateToken.js";
import {
  login as sharedLogin,
  getMe as sharedGetMe,
} from "../user/authController.js";

// --- 1. PARTNER REGISTER (Step 0: Account Creation) ---
export const registerPartner = async (req, res) => {
  try {
    const { fullName, email, password, companyName, phone } = req.body;

    if (!fullName || !email || !password || !companyName) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    let userExists = await User.findOne({ email: cleanEmail });
    if (userExists)
      return res.status(400).json({ msg: "Email already registered" });

    const user = new User({
      fullName,
      email: cleanEmail,
      password,
      phone,
      companyName,
      role: "Partner",
      isPhoneVerified: false,
    });

    await user.save();

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      token,
      userId: user._id,
      user: {
        id: user._id,
        fullName: user.fullName,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (err) {
    console.error("Partner Registration Error:", err);
    return res.status(500).json({ msg: "Registration failed" });
  }
};

// --- 2. UPDATE PARTNER PROFILE (Handles 3-Step Registration + Real Files) ---
export const updatePartnerProfile = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const {
      agencyName,
      businessType,
      contactPerson,
      address,
      regNumber,
      estYear,
      experience,
      language,
      bestTime,
      contact,
      recruiters,
    } = req.body;

    const files = req.files || {};
    const getFilePath = (fieldName) => {
      return files[fieldName]
        ? `/uploads/partners/${files[fieldName][0].filename}`
        : undefined;
    };

    const updateData = {
      companyName: agencyName,
      businessType: businessType,
      fullName: contactPerson,
      address: address,
      dob: estYear,
      education: experience,
      language: language,
      phone: contact,
      "preferences.bestTime": bestTime,
      kycData: {
        documentType: "Partner Business Verification",
        addressProofFile: getFilePath("regCert"),
        idFront: getFilePath("idProof"),
        loa: getFilePath("mou"),
        passbook: getFilePath("gstCert"),
        addressDocType: recruiters,
        submittedAt: new Date(),
      },
      kycStatus: "Pending",
    };

    const updatedUser = await User.findByIdAndUpdate(
      partnerId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, msg: "Partner not found" });
    }

    return res.status(200).json({
      success: true,
      msg: "Registration details and documents saved successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Partner Profile Update Error:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Server error saving data" });
  }
};

// --- 3. GET DYNAMIC DASHBOARD STATS ---
// This fetches real numbers for the dashboard cards and recent applications
export const getDashboardStats = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // 1. Fetch Partner to get basic info and commission info
    const partner = await User.findById(partnerId).populate({
      path: "referredStudents",
      options: { sort: { createdAt: -1 }, limit: 5 }, // Only get 5 most recent
    });

    if (!partner) {
      return res.status(404).json({ msg: "Partner not found" });
    }

    // 2. Calculate Stats from referredStudents array
    // Note: In production, you might query the Students collection directly where referrer = partnerId
    const referredStudents = partner.referredStudents || [];

    const stats = {
      totalCommission: partner.commissionRate || 1450, // Fallback to 1450 if 0
      activeStudents: referredStudents.length,
      appsInProgress: referredStudents.filter((s) => s.kycStatus === "Pending")
        .length,
      approvedLoans: referredStudents.filter((s) => s.kycStatus === "Verified")
        .length,
      pendingVerification: referredStudents.filter(
        (s) => s.kycStatus === "Pending"
      ).length,
      recentApplications: referredStudents, // The populated last 5
    };

    return res.status(200).json({
      success: true,
      stats,
      user: {
        fullName: partner.fullName,
        avatar: partner.avatar,
        companyName: partner.companyName,
      },
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    return res.status(500).json({ msg: "Failed to fetch dashboard data" });
  }
};

export const login = sharedLogin;
export const getMe = sharedGetMe;
