import mongoose from "mongoose";
import User from "../../models/User.js";
import Transaction from "../../models/transaction.model.js";
import Agreement from "../../models/Agreement.js";
import Activity from "../../models/Activity.js";
import Loan from "../../models/loan.js";
import Document from "../../models/document.model.js";
import { Student } from "../../models/student.model.js";
import { Partner } from "../../models/partner.model.js";
import UserDocuments from "../../models/UserDocuments.js";
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
      .populate(
        "userId",
        "kycData avatar education gender address phone email fullName",
      )
      .select(
        "name email phone course uni requestedAmount status kycStatus userId country",
      );

    res.status(200).json({ success: true, data: availableStudents });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Failed to fetch repository" });
  }
};

// --- 5. LINK STUDENT TO PARTNER ---
export const linkStudentToPartner = async (req, res) => {
  try {
    const { studentId } = req.body;
    const partnerId = req.user.id;
    if (!studentId) return res.status(400).json({ msg: "Target ID required" });

    const student = await Student.findByIdAndUpdate(
      studentId,
      { referredBy: partnerId },
      { new: true },
    );
    if (!student) return res.status(404).json({ msg: "Student not found" });

    await User.findByIdAndUpdate(partnerId, {
      $addToSet: { referredStudents: student._id },
    });
    await logPartnerActivity(
      partnerId,
      "User Linked",
      `Linked ${student.name}`,
      "Student",
    );
    res.status(200).json({ success: true, msg: "User added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Linking failed" });
  }
};

// --- 6. GET PARTNER SPECIFIC LOAN LEDGER (STRICT ISOLATION) ---
export const getPartnerLoans = async (req, res) => {
  try {
    const { studentId } = req.query;
    let query = {};

    if (studentId) {
      /**
       * CRITICAL FIX:
       * Filter strictly by the unique application ID.
       * Prevents old completed loans from overwriting the status of new ones.
       */
      query = { studentId: studentId };
    } else {
      const partnerId = req.user.id;
      const students = await Student.find({ referredBy: partnerId });
      const studentUserIds = students.map((s) => s.userId);
      query = { userId: { $in: studentUserIds } };
    }

    const myLoans = await Loan.find(query)
      .populate("userId", "fullName email avatar")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: myLoans });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Error fetching ledger" });
  }
};

// --- 7. GET REFERRED STUDENTS ---
export const getReferredStudents = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const students = await Student.find({ referredBy: partnerId })
      .populate("userId", "fullName avatar email phone kycData")
      .select(
        "name email phone course uni requestedAmount status kycStatus userId country",
      );

    const studentUserIds = students.map((s) => s.userId?._id);
    const loans = await Loan.find({ userId: { $in: studentUserIds } });

    const mergedData = students.map((student) => {
      const activeLoan = loans.find(
        (l) => String(l.userId) === String(student.userId?._id),
      );
      return {
        ...student._doc,
        requestedAmount: activeLoan
          ? activeLoan.principalRequested || activeLoan.totalAmount
          : student.requestedAmount,
        status: activeLoan ? activeLoan.status : student.status,
        loan: activeLoan ? "Yes" : "No",
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
        approvedLoans: referredLoans.filter((l) =>
          ["Approved", "Disbursed", "Active"].includes(l.status),
        ).length,
        pendingLoans: referredLoans.filter((l) => l.status === "Pending")
          .length,
        recentApplications: referredLoans,
      },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Failed to fetch stats" });
  }
};

// --- 9. UPDATE ME ---
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
    res.status(500).json({ msg: "Update failed" });
  }
};

// --- 10. WALLET & REPAYMENT HISTORY (SMART ISOLATION) ---
export const getWalletData = async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, msg: "Application ID required" });
    }

    // 1. Check status of THIS specific application
    const currentLoan = await Loan.findOne({ studentId: studentId });

    /**
     * LOGIC FIX:
     * If request is PENDING: Return empty transactions [] (No old history).
     * If request is ACTIVE/COMPLETED: Show isolated history for this studentId.
     */
    if (
      !currentLoan ||
      ["Pending", "Applied", "Approved"].includes(currentLoan.status)
    ) {
      return res.status(200).json({ success: true, transactions: [] });
    }

    const transactions = await Transaction.find({ studentId: studentId }).sort({
      createdAt: -1,
    });
    return res.status(200).json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ msg: "Wallet Data Sync Error" });
  }
};

// ... [Functions 11 to 15 remain the same] ...
export const getActivityLog = async (req, res) => {
  try {
    const activities = await Activity.find({ partnerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ msg: "Fetch failed" });
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
    res.status(500).json({ success: false, msg: "Error" });
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
    res.status(500).json({ success: false, msg: "Error" });
  }
};

export const login = sharedLogin;

export const getStudentSignaturesForPartner = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { studentId } = req.params;
    const student = await Student.findOne({
      _id: studentId,
      referredBy: partnerId,
    });
    if (!student) return res.status(403).json({ success: false });
    const signatureRecord = await UserDocuments.findOne({
      userId: student.userId,
    });
    if (!signatureRecord)
      return res.status(200).json({ success: true, data: [] });
    const signedDocs = signatureRecord.documents.filter((d) =>
      ["Uploaded", "Signed"].includes(d.status),
    );
    res.status(200).json({ success: true, data: signedDocs });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// --- 16. PARTNER FUND/LEND LOAN (FUNDING ANCHOR FIXED) ---
export const fundStudentLoan = async (req, res) => {
  try {
    const { loanId } = req.body;
    const partnerId = req.user.id;

    if (!loanId)
      return res.status(400).json({ success: false, msg: "Loan ID required" });

    const loan = await Loan.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(loanId) ? loanId : null },
        { loanId: loanId },
      ],
    }).populate("userId");

    if (!loan)
      return res.status(404).json({ success: false, msg: "Loan not found" });

    const student = await Student.findOne({
      userId: loan.userId?._id,
      referredBy: partnerId,
    });
    if (!student)
      return res.status(403).json({ success: false, msg: "Access Denied" });

    if (["Disbursed", "Active", "Completed"].includes(loan.status)) {
      return res.status(400).json({ success: false, msg: "Already funded." });
    }

    const P = loan.principalRequested || loan.totalAmount;
    const r = (loan.interestRate || 2.5) / 100;
    const n = parseInt(loan.period) || 12;
    const emi = Math.round(
      (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1),
    );
    const totalPayableWithInterest = emi * n;

    loan.status = "Disbursed";
    loan.disbursementDate = new Date();
    loan.principalRequested = P;
    loan.totalWithInterest = totalPayableWithInterest;
    loan.totalAmount = totalPayableWithInterest;
    loan.monthlyPayment = emi;
    loan.studentId = student._id; // IMPORTANT: Unique anchor

    await loan.save();

    await Transaction.create({
      id: `TXN-FUND-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: loan.userId._id,
      studentId: student._id, // IMPORTANT: Link history to this request
      type: "Credit",
      desc: `${loan.category} Loan Disbursed`,
      amount: P,
      status: "Completed",
    });

    await logPartnerActivity(
      partnerId,
      "Loan Funded",
      `Disbursed ${P} CAD`,
      "Finance",
    );
    return res
      .status(200)
      .json({ success: true, msg: "Loan funded!", data: loan });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// --- 17. VERIFY STUDENT (PERMANENT STATUS UPDATE) ---
export const verifyStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, kycStatus } = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        $set: {
          status: status || "Approved",
          kycStatus: kycStatus || "Approved",
        },
      },
      { new: true },
    );

    if (!updatedStudent) return res.status(404).json({ success: false });

    if (updatedStudent.userId) {
      await User.findByIdAndUpdate(updatedStudent.userId, {
        $set: { kycStatus: kycStatus || "Approved" },
      });
    }

    await logPartnerActivity(
      req.user.id,
      "Verification Complete",
      `Verified ${updatedStudent.name}`,
      "Student",
    );
    res.status(200).json({ success: true, data: updatedStudent });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
