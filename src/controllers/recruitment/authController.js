import User from "../../models/User.js";
import Transaction from "../../models/transaction.model.js";
import Agreement from "../../models/Agreement.js";
import Activity from "../../models/Activity.js";
import Loan from "../../models/loan.js";
import Document from "../../models/document.model.js";
import { Student } from "../../models/student.model.js";
import { Partner } from "../../models/partner.model.js";
import { generateToken } from "../../utils/generateToken.js";
import { login as sharedLogin } from "../user/authController.js";

// --- HELPER: LOG ACTIVITY ---
const logPartnerActivity = async (partnerId, action, details, category) => {
  try {
    await Activity.create({ partnerId, action, details, category });
  } catch (err) {
    console.error("Activity Log Error:", err);
  }
};

// --- 1. GET ME ---
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching profile" });
  }
};

// --- 2. PARTNER REGISTER ---
export const registerPartner = async (req, res) => {
  try {
    const { fullName, email, password, companyName, phone } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ msg: "Required fields missing" });
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
      companyName: companyName || "Pending",
      role: "Partner",
    });
    await user.save();

    await logPartnerActivity(
      user._id,
      "Account Created",
      "Partner registered",
      "System",
    );

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Registration failed" });
  }
};

// --- 3. UPDATE PARTNER PROFILE ---
export const updatePartnerProfile = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const {
      agencyName,
      businessType,
      contactPerson,
      address,
      estYear,
      experience,
      language,
      contact,
    } = req.body;

    const files = req.files || {};
    const getFilePath = (fieldName) =>
      files[fieldName]
        ? `/uploads/partners/${files[fieldName][0].filename}`
        : undefined;

    const updateData = {
      companyName: agencyName,
      businessType,
      fullName: contactPerson,
      address,
      dob: estYear,
      education: experience,
      language,
      phone: contact,
      kycData: {
        addressProofFile: getFilePath("regCert"),
        idFront: getFilePath("idProof"),
        loa: getFilePath("mou"),
        passbook: getFilePath("gstCert"),
        submittedAt: new Date(),
      },
      kycStatus: "Pending",
    };

    const updatedUser = await User.findByIdAndUpdate(
      partnerId,
      { $set: updateData },
      { new: true },
    );

    await Partner.findOneAndUpdate(
      { email: updatedUser.email },
      {
        name: updatedUser.fullName || contactPerson,
        email: updatedUser.email,
        phone: contact || updatedUser.phone,
        businessName: agencyName || updatedUser.companyName,
        businessType: "Agency",
        address: address,
        status: "Active",
        experience: experience,
        country: "Canada",
      },
      { upsert: true, new: true },
    );

    const kycFileMap = [
      { field: "regCert", label: "Business Registration Certificate" },
      { field: "gstCert", label: "GST Registration" },
      { field: "idProof", label: "Identity Proof" },
      { field: "mou", label: "Signed MOU" },
    ];

    const documentEntries = [];
    kycFileMap.forEach((item) => {
      const path = getFilePath(item.field);
      if (path) {
        documentEntries.push({
          name: `${agencyName || "Partner"} - ${item.label}`,
          category: "Partner Documents",
          fileUrl: path,
          uploadedBy: partnerId,
        });
      }
    });

    if (documentEntries.length > 0) await Document.insertMany(documentEntries);
    await logPartnerActivity(
      partnerId,
      "KYC Submitted",
      "Uploaded docs",
      "Document",
    );
    return res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

// --- 4. GET UNLINKED STUDENTS ---
export const getAvailableStudents = async (req, res) => {
  try {
    const availableStudents = await Student.find({
      $or: [{ referredBy: { $exists: false } }, { referredBy: null }],
    })
      .populate("userId", "kycData avatar education gender address")
      .select(
        "name email phone course uni requestedAmount status kycStatus userId",
      );

    res.status(200).json({ success: true, data: availableStudents });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, msg: "Failed to fetch user repository" });
  }
};

// --- 5. LINK STUDENT TO PARTNER ---
export const linkStudentToPartner = async (req, res) => {
  try {
    const { studentId } = req.body;
    const partnerId = req.user.id;

    if (!studentId)
      return res.status(400).json({ msg: "Target User ID required" });

    const student = await Student.findByIdAndUpdate(
      studentId,
      { referredBy: partnerId },
      { new: true },
    );
    if (!student)
      return res.status(404).json({ msg: "Student record not found" });

    await User.findByIdAndUpdate(partnerId, {
      $addToSet: { referredStudents: student._id },
    });

    await logPartnerActivity(
      partnerId,
      "User Linked",
      `Linked ${student.name} to panel`,
      "Student",
    );
    res
      .status(200)
      .json({ success: true, msg: "User successfully added to your panel" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Linking operation failed" });
  }
};

// --- 6. GET PARTNER SPECIFIC LOAN LEDGER (FINAL FIX) ---
export const getPartnerLoans = async (req, res) => {
  try {
    const partnerId = req.user.id;

    // 1. Get all students linked to this partner
    const students = await Student.find({ referredBy: partnerId });
    const studentUserIds = students.map((s) => s.userId);

    // 2. Fetch loans from the global ledger where userId matches your students
    const myLoans = await Loan.find({ userId: { $in: studentUserIds } })
      .populate("userId", "fullName email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: myLoans });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Error fetching loan ledger" });
  }
};

// --- 7. GET REFERRED STUDENTS (UI SYNC) ---
export const getReferredStudents = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const students = await Student.find({ referredBy: partnerId }).populate(
      "userId",
      "fullName avatar email",
    );

    // Fetch actual loans to merge real requested amounts
    const studentUserIds = students.map((s) => s.userId?._id);
    const loans = await Loan.find({ userId: { $in: studentUserIds } });

    const mergedData = students.map((student) => {
      const activeLoan = loans.find(
        (l) => l.userId.toString() === student.userId?._id.toString(),
      );
      return {
        ...student._doc,
        requestedAmount: activeLoan
          ? activeLoan.totalAmount
          : student.requestedAmount,
        status: activeLoan ? activeLoan.status : student.status,
        loan: activeLoan ? "Yes" : student.loan,
      };
    });

    return res.status(200).json({ success: true, students: mergedData });
  } catch (err) {
    return res.status(500).json({ msg: "Server error fetching students" });
  }
};

// --- 8. DASHBOARD STATS ---
export const getDashboardStats = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const students = await Student.find({ referredBy: partnerId });
    const studentUserIds = students.map((s) => s.userId);

    const referredLoans = await Loan.find({ userId: { $in: studentUserIds } })
      .sort({ createdAt: -1 })
      .populate("userId", "fullName avatar");

    return res.status(200).json({
      success: true,
      stats: {
        activeStudents: students.length,
        appsInProgress: students.filter((s) => s.kycStatus === "Pending")
          .length,
        approvedLoans: referredLoans.filter((l) => l.status === "Approved")
          .length,
        pendingLoans: referredLoans.filter((l) => l.status === "Pending")
          .length,
        recentApplications: referredLoans.slice(0, 5),
      },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Failed to fetch stats" });
  }
};

export const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, companyName, email, phone, address, businessType } =
      req.body;
    const updateFields = {
      fullName,
      companyName,
      email: email?.toLowerCase().trim(),
      phone,
      address,
      businessType,
    };
    if (req.file) updateFields.avatar = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true },
    ).select("-password");
    await Partner.findOneAndUpdate(
      { email: updatedUser.email },
      { name: fullName, phone, businessName: companyName },
    );
    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ msg: "Failed to update profile" });
  }
};

export const getWalletData = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ msg: "Wallet Error" });
  }
};

export const getActivityLog = async (req, res) => {
  try {
    const activities = await Activity.find({ partnerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch activity log" });
  }
};

export const getAgreementDetails = async (req, res) => {
  try {
    const agreement = await Agreement.findOne({
      partnerId: req.user.id,
    }).populate("adminId partnerId");
    return res
      .status(200)
      .json({ success: true, agreement: agreement || null });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Error fetching agreement" });
  }
};

export const signAgreement = async (req, res) => {
  try {
    const agreement = await Agreement.findOneAndUpdate(
      { partnerId: req.user.id },
      { status: "Signed_By_Partner", partnerSignedAt: new Date() },
      { new: true },
    );
    res.status(200).json({ success: true, agreement });
  } catch (err) {
    res.status(500).json({ msg: "Signing failed" });
  }
};

export const getAllPartners = async (req, res) => {
  try {
    const partners = await Partner.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};

export const login = sharedLogin;
// Add this to your recruitment/partner controller
export const getStudentSignaturesForPartner = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { studentId } = req.params;

    // 1. Verify the student is actually referred by this partner
    const student = await Student.findOne({
      _id: studentId,
      referredBy: partnerId,
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        msg: "Access denied or student not found in your portfolio",
      });
    }

    // 2. Fetch the signatures using the student's userId (Matching the Admin logic)
    // We assume there is a Signature model linked by userId
    const signatureRecord = await Signature.findOne({ userId: student.userId });

    if (!signatureRecord) {
      return res.status(200).json({ success: true, documents: [] });
    }

    // 3. Return the documents that are signed/uploaded
    const signedDocs = signatureRecord.documents.filter(
      (d) => d.status === "Uploaded" || d.status === "Signed",
    );

    res.status(200).json({ success: true, data: signedDocs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
