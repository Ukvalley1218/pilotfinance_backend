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
import withdrawalModel from "../../models/withdrawal.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import transporter from "../../utils/mail.js";

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
      return res.status(400).json({
        success: false,
        msg: "Full Name, Email and Password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(409).json({
        success: false,
        msg: "This email is already registered.",
      });
    }

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
      msg: "Partner registered successfully.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register Partner Error:", err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        msg: errors.join(", "),
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "Duplicate email detected.",
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Registration failed. Please try again.",
    });
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

export const sendPartnerResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({
        success: false,
        msg: "Email is required",
      });

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: "Partner",
    });

    if (!user)
      return res.status(404).json({
        success: false,
        msg: "Partner account not found",
      });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otpCode = otp; // ✅ plain store
    user.otpExpires = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    await transporter.sendMail({
      from: `"Pilot Finance" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `<h2>Your OTP is: ${otp}</h2>`,
    });

    return res.status(200).json({
      success: true,
      msg: "OTP sent successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      msg: "Failed to send OTP",
    });
  }
};

export const verifyPartnerResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({
        success: false,
        msg: "Email and OTP are required",
      });

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: "Partner",
    });

    if (!user || !user.otpCode)
      return res.status(400).json({
        success: false,
        msg: "Invalid request",
      });

    if (user.otpExpires < Date.now())
      return res.status(400).json({
        success: false,
        msg: "OTP expired",
      });

    if (user.otpCode !== otp)
      return res.status(400).json({
        success: false,
        msg: "Invalid OTP",
      });

    return res.status(200).json({
      success: true,
      msg: "OTP verified successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: "OTP verification failed",
    });
  }
};

export const resetPartnerPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({
        success: false,
        msg: "All fields are required",
      });

    if (newPassword.length < 6)
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters",
      });

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: "Partner",
    });

    if (!user)
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });

    if (user.otpExpires < Date.now())
      return res.status(400).json({
        success: false,
        msg: "OTP expired",
      });

    if (user.otpCode !== otp)
      return res.status(400).json({
        success: false,
        msg: "Invalid OTP",
      });

    user.password = newPassword; // hashed by pre-save hook
    user.otpCode = undefined;
    user.otpExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      msg: "Password reset successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: "Password reset failed",
    });
  }
};

// --- 3. UPDATE PARTNER PROFILE ---
export const updatePartnerProfile = async (req, res) => {
  try {
    const partnerId = req.user?.id;

    if (!partnerId) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access.",
      });
    }

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
    const getFilePath = (field) =>
      files[field] ? files[field][0].path : undefined;

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

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        msg: "Partner not found.",
      });
    }

    await logPartnerActivity(
      partnerId,
      "KYC Submitted",
      "Documents uploaded",
      "Document",
    );

    return res.status(200).json({
      success: true,
      msg: "Profile updated successfully. KYC submitted for review.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to update profile.",
    });
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

    return res.status(200).json({
      success: true,
      count: availableStudents.length,
      data: availableStudents,
    });
  } catch (err) {
    console.error("Fetch Students Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch available students.",
    });
  }
};

// --- 5. LINK STUDENT TO PARTNER ---
export const linkStudentToPartner = async (req, res) => {
  try {
    const { studentId } = req.body;
    const partnerId = req.user?.id;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        msg: "Student ID is required.",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student not found.",
      });
    }

    if (student.referredBy) {
      return res.status(409).json({
        success: false,
        msg: "Student is already linked to a partner.",
      });
    }

    student.referredBy = partnerId;
    await student.save();

    await User.findByIdAndUpdate(partnerId, {
      $addToSet: { referredStudents: student._id },
    });

    await logPartnerActivity(
      partnerId,
      "Student Linked",
      `Linked ${student.name}`,
      "Student",
    );

    return res.status(200).json({
      success: true,
      msg: "Student linked successfully.",
    });
  } catch (err) {
    console.error("Link Student Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to link student.",
    });
  }
};

// --- 6. GET PARTNER SPECIFIC LOAN LEDGER (STRICT ISOLATION) ---
export const getPartnerLoans = async (req, res) => {
  try {
    const { studentId } = req.query;
    const partnerId = req.user?.id;

    if (!partnerId) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized access.",
      });
    }

    let query = {};

    if (studentId) {
      query = { studentId };
    } else {
      const partnerStudents = await Student.find({
        referredBy: partnerId,
      }).select("_id");

      const studentIds = partnerStudents.map((s) => s._id);

      query = { studentId: { $in: studentIds } };
    }

    const loans = await Loan.find(query)
      .populate("studentId", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: loans.length,
      data: loans,
    });
  } catch (err) {
    console.error("Fetch Loans Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching loan ledger.",
    });
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

    // 1️⃣ Get referred students
    const students = await Student.find({ referredBy: partnerId });
    const studentIds = students.map((s) => s._id);

    // 2️⃣ Get referred loans
    const referredLoans = await Loan.find({
      studentId: { $in: studentIds },
    })
      .sort({ createdAt: -1 })
      .populate("studentId", "name");

    // 3️⃣ Get Commission Transactions ONLY
    const commissionTransactions = await Transaction.find({
      userId: partnerId,
      type: "Credit",
      status: "Completed",
      desc: "Commission for Education Loan", // 👈 filters only commission
    });

    // 4️⃣ Calculate total commission earned
    const totalCommissionEarned = commissionTransactions.reduce(
      (sum, txn) => sum + txn.amount,
      0,
    );

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

        // ✅ Commission Data Added
        totalCommissionEarned,
        commissionTransactionsCount: commissionTransactions.length,

        recentApplications: referredLoans,
      },
    });
  } catch (err) {
    console.error(err);
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
    const { status, kycStatus, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid student ID",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student not found",
      });
    }

    // 🚨 BUSINESS RULE:
    // If KYC is still Pending → cannot verify
    if (student.kycStatus === "Not Submitted") {
      return res.status(400).json({
        success: false,
        msg: "Student KYC is still Not Submitted. Verification not allowed.",
      });
    }

    // Optional: Prevent double approval
    if (student.status === "Approved") {
      return res.status(400).json({
        success: false,
        msg: "Student is already approved.",
      });
    }

    // Optional: Allow only Approved/Rejected values
    const allowedStatus = ["Approved", "Rejected"];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid status value.",
      });
    }

    // ✅ Update student
    student.status = status || "Approved";
    if (kycStatus) student.kycStatus = kycStatus;
    if (reason) student.reason = reason;

    await student.save();

    await logPartnerActivity(
      req.user.id,
      "Verification Complete",
      `Verified ${student.name}`,
      "Student",
    );

    return res.status(200).json({
      success: true,
      msg: "Student verified successfully.",
      data: student,
    });
  } catch (err) {
    console.error("Verify Student Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Verification failed",
    });
  }
};

export const addStudentByPartner = async (req, res) => {
  try {
    const partnerId = req.user?.id;
    const { name, email, phone, password, address } = req.body;

    // ✅ Check partner authentication
    if (!partnerId) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized. Partner login required.",
      });
    }

    // ✅ Required fields validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        msg: "Name, Email, Phone and Password are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // ✅ Check existing email
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        msg: "This email is already registered. Please use another email.",
      });
    }

    // ✅ Create student (password will auto-hash in schema)
    const student = await Student.create({
      name,
      email: cleanEmail,
      phone,
      password,
      address,
      referredBy: partnerId,
      status: "Pending",
    });

    // ✅ Update partner record
    await User.findByIdAndUpdate(partnerId, {
      $addToSet: { referredStudents: student._id },
    });

    // ✅ Log activity
    await logPartnerActivity(
      partnerId,
      "Student Added",
      `Added ${name}`,
      "Student",
    );

    return res.status(201).json({
      success: true,
      msg: "Student added successfully.",
      student,
    });
  } catch (err) {
    console.error("Add Student Error:", err);

    // ✅ Mongoose validation error
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        msg: errors.join(", "),
      });
    }

    // ✅ Duplicate key error (unique index)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "Duplicate field value entered. Email may already exist.",
      });
    }

    // ✅ Default fallback
    return res.status(500).json({
      success: false,
      msg: "Something went wrong while adding student. Please try again.",
    });
  }
};

// --- 19. DELETE STUDENT (PARTNER CONTROLLED) ---
export const deleteStudentByPartner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const partnerId = req.user?.id;
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid student ID",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      referredBy: partnerId,
    }).session(session);

    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student not found or not authorized",
      });
    }

    await User.findByIdAndUpdate(
      partnerId,
      { $pull: { referredStudents: student._id } },
      { session },
    );

    await Loan.deleteMany({ studentId: student._id }).session(session);
    await Transaction.deleteMany({ studentId: student._id }).session(session);

    await student.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    await logPartnerActivity(
      partnerId,
      "Student Deleted",
      `Deleted ${student.name}`,
      "Student",
    );

    return res.status(200).json({
      success: true,
      msg: "Student deleted successfully",
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delete Student Error:", err);

    return res.status(500).json({
      success: false,
      msg: "Failed to delete student",
    });
  }
};

export const getLoanWithStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid loan ID",
      });
    }

    const loan = await Loan.findById(id)
      .populate("studentId")
      .populate("partnerId", "fullName email role");

    if (!loan) {
      return res.status(404).json({
        success: false,
        msg: "Loan not found",
      });
    }

    // 🔐 Ensure partner owns this student
    if (loan.studentId.referredBy?.toString() !== partnerId) {
      return res.status(403).json({
        success: false,
        msg: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (err) {
    console.error("Fetch Loan Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch loan",
    });
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

// --- PARTNER REQUEST WITHDRAW ---
export const requestWithdrawal = async (req, res) => {
  try {
    if (req.user.role !== "Partner") {
      return res.status(403).json({ msg: "Only partners can withdraw" });
    }

    const partnerId = new mongoose.Types.ObjectId(req.user.id);
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: "Invalid amount" });
    }

    // 🚫 Block if already pending
    const existingPending = await withdrawalModel.findOne({
      partnerId,
      status: "Pending",
    });

    if (existingPending) {
      return res.status(400).json({
        msg: "You already have a pending withdrawal request",
      });
    }

    // 💰 Calculate Balance (Single Query)
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: partnerId,
          status: "Completed",
        },
      },
      {
        $group: {
          _id: null,
          credits: {
            $sum: {
              $cond: [{ $eq: ["$type", "Credit"] }, "$amount", 0],
            },
          },
          debits: {
            $sum: {
              $cond: [{ $eq: ["$type", "Debit"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    const totalCredits = result[0]?.credits || 0;
    const totalDebits = result[0]?.debits || 0;
    const balance = totalCredits - totalDebits;

    if (amount > balance) {
      return res.status(400).json({ msg: "Insufficient wallet balance" });
    }

    const withdrawal = await withdrawalModel.create({
      partnerId,
      amountRequested: amount,
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      balance,
      data: withdrawal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Withdrawal request failed" });
  }
};

export const creditPartnerWallet = async (req, res) => {
  try {
    const { partnerId, amount } = req.body;

    await Transaction.create({
      id: `TXN-TEST-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: partnerId,
      type: "Credit",
      desc: "Manual Test Credit",
      amount,
      status: "Completed",
    });

    res.json({ success: true, msg: "Wallet credited" });
  } catch (err) {
    res.status(500).json({ msg: "Failed" });
  }
};

export const getMyWithdrawals = async (req, res) => {
  try {
    if (req.user.role !== "Partner") {
      return res.status(403).json({
        success: false,
        msg: "Only partners allowed",
      });
    }

    const partnerId = req.user.id;

    // 1️⃣ Fetch Withdrawals
    const withdrawals = await withdrawalModel
      .find({ partnerId })
      .sort({ createdAt: -1 })
      .lean();

    // 2️⃣ Fetch Commission Credit Transactions
    const commissionTransactions = await Transaction.find({
      userId: partnerId,
      type: "Credit",
      status: "Completed",
    })
      .sort({ createdAt: -1 })
      .lean();

    // 3️⃣ Format Withdrawal Data
    const formattedWithdrawals = withdrawals.map((w) => ({
      id: w._id,
      type: "Withdrawal",
      status: w.status,
      amount: w.amountRequested,
      createdAt: w.createdAt,
      description: `Withdrawal Request (${w.status})`,
    }));

    // 4️⃣ Format Commission Transactions
    const formattedCommissions = commissionTransactions.map((t) => ({
      id: t._id,
      type: "Commission",
      status: t.status,
      amount: t.amount,
      createdAt: t.createdAt,
      description: t.desc || "Commission Credited",
      subDescription: t.subDesc || "",
      txnId: t.id,
    }));

    // 5️⃣ Merge Both
    const mergedHistory = [
      ...formattedWithdrawals,
      ...formattedCommissions,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 🔥 Summary
    const summary = withdrawals.reduce(
      (acc, w) => {
        if (w.status === "Completed") {
          acc.totalWithdrawn += w.amountRequested;
        }
        if (w.status === "Pending") {
          acc.totalPending += w.amountRequested;
        }
        if (w.status === "Rejected") {
          acc.totalRejected += w.amountRequested;
        }
        return acc;
      },
      { totalWithdrawn: 0, totalPending: 0, totalRejected: 0 },
    );

    return res.status(200).json({
      success: true,
      summary,
      data: mergedHistory,
    });
  } catch (err) {
    console.error("Partner Withdrawals Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch withdrawal & commission history",
    });
  }
};

export const getWalletSummary = async (req, res) => {
  try {
    if (req.user.role !== "Partner") {
      return res.status(403).json({
        success: false,
        msg: "Only partners allowed",
      });
    }

    const partnerId = new mongoose.Types.ObjectId(req.user.id);

    const [transactionResult, withdrawalStats] = await Promise.all([
      // 1️⃣ Real Transactions
      Transaction.aggregate([
        {
          $match: {
            userId: partnerId,
            status: "Completed",
          },
        },
        {
          $group: {
            _id: null,
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ["$type", "Credit"] }, "$amount", 0],
              },
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ["$type", "Debit"] }, "$amount", 0],
              },
            },
          },
        },
      ]),

      // 2️⃣ Withdrawal Stats
      withdrawalModel.aggregate([
        {
          $match: { partnerId },
        },
        {
          $group: {
            _id: "$status",
            totalAmount: { $sum: "$amountRequested" },
          },
        },
      ]),
    ]);

    const totalCredits = transactionResult[0]?.totalCredits || 0;
    const totalDebits = transactionResult[0]?.totalDebits || 0;

    let totalPending = 0;
    let totalWithdrawn = 0;
    let totalRejected = 0;

    withdrawalStats.forEach((item) => {
      if (item._id === "Pending") totalPending = item.totalAmount;
      if (item._id === "Completed") totalWithdrawn = item.totalAmount;
      if (item._id === "Rejected") totalRejected = item.totalAmount;
    });

    const actualBalance = totalCredits - totalWithdrawn;
    const availableBalance = actualBalance - totalPending;

    return res.status(200).json({
      success: true,
      wallet: {
        totalCredits,
        totalDebits,
        totalWithdrawn, // Only completed withdrawals
        totalRejected, // For analytics only
        pendingWithdrawals: totalPending,
        actualBalance,
        availableBalance,
      },
    });
  } catch (err) {
    console.error("Wallet Summary Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Wallet summary failed",
    });
  }
};

// search apis
export const searchLoansByStudentName = async (req, res) => {
  try {
    const partnerId = req.user?.id;
    const { search = "", page = 1, limit = 10 } = req.query;

    if (!partnerId) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized",
      });
    }

    // Step 1: Find partner's students matching name
    const students = await Student.find({
      referredBy: partnerId,
      name: { $regex: search, $options: "i" },
    }).select("_id name email phone");

    const studentIds = students.map((s) => s._id);

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Step 2: Find loans for those students
    const loans = await Loan.find({
      studentId: { $in: studentIds },
    })
      .populate("studentId", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      count: loans.length,
      data: loans,
    });
  } catch (err) {
    console.error("Search Loans Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to search loans",
    });
  }
};

export const searchMyStudents = async (req, res) => {
  try {
    const partnerId = req.user?.id;
    const { search = "", page = 1, limit = 10 } = req.query;

    const students = await Student.find({
      referredBy: partnerId,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (err) {
    console.error("Search Students Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to search students",
    });
  }
};

export const dashboardSearch = async (req, res) => {
  try {
    const partnerId = req.user?.id;
    const { search = "" } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        msg: "Search query required",
      });
    }

    // 1️⃣ Search Students
    const students = await Student.find({
      referredBy: partnerId,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    })
      .select("name email phone status kycStatus")
      .limit(5)
      .lean();

    const studentIds = students.map((s) => s._id);

    // 2️⃣ Search Loans
    const loans = await Loan.find({
      studentId: { $in: studentIds },
    })
      .select("loanId status totalAmount principalRequested createdAt")
      .populate("studentId", "name")
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      results: {
        students,
        loans,
      },
    });
  } catch (err) {
    console.error("Dashboard Search Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Search failed",
    });
  }
};
