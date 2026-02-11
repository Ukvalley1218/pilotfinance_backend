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
import bcrypt from "bcryptjs";

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
      files[fieldName] ? files[fieldName][0].path : undefined;

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
      referredBy: { $exists: false },
    }).select(
      "name email phone course uni requestedAmount status kycStatus country",
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
    if (student.referredBy)
      return res.status(400).json({ msg: "Student already linked" });

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

      const partnerStudents = await Student.find({
        referredBy: partnerId,
      }).select("_id");
      const studentIds = partnerStudents.map((s) => s._id);

      query = { studentId: { $in: studentIds } };
    }

    const myLoans = await Loan.find(query)
      .populate("studentId", "name email phone")
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
    const students = await Student.find({ referredBy: partnerId });

    const loans = await Loan.find({
      studentId: { $in: students.map((s) => s._id) },
    });

    const mergedData = students.map((student) => {
      const activeLoan = loans.find(
        (l) => String(l.studentId) === String(student._id),
      );
      return {
        ...student._doc,
        requestedAmount:
          activeLoan?.principalRequested || student.requestedAmount,
        status: activeLoan?.status || student.status,
        loan: activeLoan ? "Yes" : "No",
        Interest: activeLoan?.interestRate,
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

    const studentIds = students.map((s) => s._id);
    const referredLoans = await Loan.find({ studentId: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .populate("studentId", "name");

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
    if (req.file) updateFields.avatar = req.file.path;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true },
    ).select("-password");

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

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2️⃣ Find user
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 3️⃣ Check role (must be Partner)
    if (user.role !== "Partner") {
      return res
        .status(403)
        .json({ msg: "Access denied. Not a partner account." });
    }

    // 4️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 5️⃣ Log activity
    await logPartnerActivity(user._id, "Login", "Partner logged in", "System");

    // 6️⃣ Generate token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (err) {
    console.error("Partner Login Error:", err);
    return res.status(500).json({ msg: "Login failed" });
  }
};

export const getStudentSignaturesForPartner = async (req, res) => {
  try {
    const { studentId } = req.params;
    const partnerId = req.user.id;

    const student = await Student.findOne({
      _id: studentId,
      referredBy: partnerId,
    });

    if (!student) return res.status(403).json({ success: false });

    const signedDocs = student.documents.filter((d) =>
      ["Uploaded", "Signed"].includes(d.status),
    );

    res.status(200).json({ success: true, data: signedDocs });
  } catch {
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

    const loan = await Loan.findOne({ _id: loanId }).populate("studentId");

    const student = await Student.findOne({
      _id: loan.studentId,
      referredBy: partnerId,
    });

    if (!student) return res.status(403).json({ msg: "Access Denied" });

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

    loan.status = "Pending";
    loan.disbursementDate = new Date();
    loan.principalRequested = P;
    loan.totalWithInterest = totalPayableWithInterest;
    loan.totalAmount = totalPayableWithInterest;
    loan.monthlyPayment = emi;
    loan.studentId = student._id; // IMPORTANT: Unique anchor

    await loan.save();

    // await Transaction.create({
    //   id: `TXN-FUND-${Math.floor(100000 + Math.random() * 900000)}`,
    //   studentId: student._id,
    //   type: "Credit",
    //   desc: `${loan.category} Loan Disbursed`,
    //   amount: P,
    //   status: "Completed",
    // });

    await logPartnerActivity(
      partnerId,
      "Loan Funded",
      `Disbursed ${P} CAD`,
      "Student",
    );
    return res
      .status(200)
      .json({ success: true, msg: "Loan funded!", data: loan });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.msg });
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

export const addStudentByPartner = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { name, email, phone, password, address } = req.body;

    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Missing required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, msg: "Email already registered" });
    }

    // ✅ DO NOT HASH HERE — schema will hash automatically
    const student = await Student.create({
      name,
      email: cleanEmail,
      phone,
      password, // plain password goes in
      address,
      referredBy: partnerId,
      status: "Pending",
      kycStatus: "Pending",
    });

    await User.findByIdAndUpdate(partnerId, {
      $addToSet: { referredStudents: student._id },
    });

    await logPartnerActivity(
      partnerId,
      "Student Added",
      `Added ${name}`,
      "Student",
    );

    res.status(201).json({ success: true, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Failed to add student" });
  }
};

// --- 19. DELETE STUDENT (PARTNER CONTROLLED) ---
export const deleteStudentByPartner = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { studentId } = req.params;

    const student = await Student.findOne({
      _id: studentId,
      referredBy: partnerId,
    });

    if (!student) {
      return res.status(404).json({ success: false, msg: "Student not found" });
    }

    // Remove student reference from partner
    await User.findByIdAndUpdate(partnerId, {
      $pull: { referredStudents: student._id },
    });

    // Remove related loans & transactions (optional safety cleanup)
    await Loan.deleteMany({ studentId: student._id });
    await Transaction.deleteMany({ studentId: student._id });

    await student.deleteOne();

    await logPartnerActivity(
      partnerId,
      "Student Deleted",
      `Deleted ${student.name}`,
      "Student",
    );

    res
      .status(200)
      .json({ success: true, msg: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Delete failed" });
  }
};

export const getLoanWithStudentById = async (req, res) => {
  try {
    const { id } = req.params; // ✅ matches route

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid loan ID" });
    }

    const loan = await Loan.findById(id)
      .populate({
        path: "studentId",
        select: "-password -otpCode -otpExpires",
        populate: [
          { path: "userId", select: "fullName email role" },
          { path: "referredBy", select: "fullName email" },
        ],
      })
      .populate("partnerId", "fullName email role");

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    res.status(200).json({
      success: true,
      loan,
      student: loan.studentId,
    });
  } catch (error) {
    console.error("❌ Error fetching loan by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- 18. PARTNER REJECT LOAN ---
export const rejectStudentLoan = async (req, res) => {
  try {
    const { loanId, reason } = req.body;
    const partnerId = req.user.id;

    if (!loanId) {
      return res.status(400).json({ success: false, msg: "Loan ID required" });
    }

    // Find loan and student
    const loan = await Loan.findById(loanId).populate("studentId");
    if (!loan) {
      return res.status(404).json({ success: false, msg: "Loan not found" });
    }

    // SECURITY: Ensure this student belongs to this partner
    const student = await Student.findOne({
      _id: loan.studentId._id,
      referredBy: partnerId,
    });

    if (!student) {
      return res.status(403).json({ success: false, msg: "Access denied" });
    }

    // Prevent rejecting after disbursement
    if (["Disbursed", "Active", "Completed"].includes(loan.status)) {
      return res.status(400).json({
        success: false,
        msg: "Loan already disbursed/active. Cannot reject.",
      });
    }

    // Update loan
    loan.status = "Rejected";
    loan.rejectionReason = reason || "Rejected by partner";
    loan.rejectedAt = new Date();

    await loan.save();

    await logPartnerActivity(
      partnerId,
      "Loan Rejected",
      `Rejected loan for ${student.name}`,
      "Finance",
    );

    return res.status(200).json({
      success: true,
      msg: "Loan rejected successfully",
      data: loan,
    });
  } catch (err) {
    console.error("Reject Loan Error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};
