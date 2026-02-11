import { Student } from "../../models/student.model.js";
import Loan from "../../models/loan.js";
import mongoose from "mongoose";
import Transaction from "../../models/transaction.model.js";
import User from "../../models/User.js";

/**
 * @desc Create Loan (Triggered from Partner/User Panel)
 * Updated to handle Monthly EMI math for consistency.
 */
export const createLoan = async (req, res) => {
  try {
    const { studentId, category, principalRequested, period, interestRate } =
      req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const n = parseInt(period) || 12;
    const r = (interestRate || 2.5) / 100;

    const emi = Math.round(
      (principalRequested * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1),
    );

    const totalWithInterest = emi * n;

    const loan = await Loan.create({
      studentId,
      partnerId: student.referredBy || null,
      category,
      principalRequested,
      totalWithInterest,
      totalAmount: totalWithInterest,
      monthlyPayment: emi,
      interestRate,
      period: `${n} Months`,
      status: "Approved",
    });

    student.loanStatus = "Approved";
    await student.save();

    res.status(201).json({ success: true, data: loan });
  } catch (err) {
    res.status(500).json({ message: "Loan creation failed" });
  }
};

/**
 * @desc Update Loan (Used by Admin for Approvals/Verification)
 */
export const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("studentId");
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const { status } = req.body;

    // ------------------ APPROVED ------------------
    if (status === "Approved" && loan.status !== "Approved") {
      loan.status = "Approved";

      const student = await Student.findById(loan.studentId);

      // Update student loan lifecycle
      await Student.findByIdAndUpdate(loan.studentId, {
        loanStatus: "Approved",
      });

      // ------------------ PARTNER COMMISSION ------------------
      if (student?.referredBy) {
        const partner = await User.findById(student.referredBy);

        if (partner && partner.commissionRate > 0) {
          const commissionAmount =
            (loan.principalRequested * partner.commissionRate) / 100;

          await Transaction.create({
            id: `TXN-COMM-${Math.floor(100000 + Math.random() * 900000)}`,
            userId: partner._id, // Wallet owner = Partner
            studentId: student._id,
            type: "Credit",
            desc: `Commission for ${loan.category} Loan`,
            subDesc: `Loan Ref: ${loan.loanId}`,
            amount: commissionAmount,
            status: "Completed",
          });

          console.log(
            `💰 Commission ${commissionAmount} credited to partner ${partner.fullName}`,
          );
        }
      }
    }

    // ------------------ DISBURSED ------------------
   if (status === "Disbursed" && loan.status !== "Disbursed") {
  loan.status = "Disbursed";
  loan.disbursementDate = new Date();

  const student = loan.studentId;
  const amount = loan.principalRequested;

  // 🔥 UPDATE STUDENT LOAN FLAGS
  await Student.findByIdAndUpdate(student._id, {
    loanStatus: "Active",
    loan: "Yes",              // <-- THIS IS THE NEW LINE
    requestedAmount: amount,  // optional but useful for UI
  });


      // ✅ CREATE TRANSACTION (LOAN CREDIT)
      await Transaction.create({
        id: `TXN-FUND-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: student.userId || student._id, // depends on your schema
        studentId: student._id,
        type: "Credit",
        desc: `${loan.category} Loan Disbursed`,
        subDesc: `Loan Ref: ${loan._id}`,
        amount: amount,
        status: "Completed",
      });
    }

    // ------------------ REJECTED ------------------
    if (status === "Rejected" && loan.status !== "Rejected") {
      loan.status = "Rejected";
      await Student.findByIdAndUpdate(loan.studentId._id, {
        loanStatus: "Rejected",
      });
    }

    Object.assign(loan, req.body);
    await loan.save();

    res.json({ success: true, data: loan });
  } catch (err) {
    console.error("Loan Update Error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};

/**
 * @desc Get All Loans (Dynamic sync for Admin Dashboard)
 */
export const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const loans = await Loan.find(filter)
      .populate("studentId", "name email phone kycStatus")
      .populate("partnerId", "fullName companyName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: loans });
  } catch {
    res.status(500).json({ message: "Failed to fetch loans" });
  }
};

/**
 * @desc Get Single Loan by ID
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("studentId")
      .populate("partnerId", "fullName companyName email");

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    res.json({ success: true, data: loan });
  } catch {
    res.status(400).json({ message: "Invalid loan ID" });
  }
};

/**
 * @desc Delete Loan
 */
export const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    await Student.findByIdAndUpdate(loan.studentId, {
      loanStatus: "Not Applied",
    });

    res.json({ success: true, message: "Loan deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};
