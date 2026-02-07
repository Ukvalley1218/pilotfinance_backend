import { Student } from "../../models/student.model.js";
import Loan from "../../models/loan.js";
import mongoose from "mongoose";

/**
 * @desc Create Loan (Triggered from Partner/User Panel)
 * Updated to handle Monthly EMI math for consistency.
 */
export const createLoan = async (req, res) => {
  try {
    const { studentId, category, principalRequested, period, interestRate } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const n = parseInt(period) || 12;
    const r = (interestRate || 2.5) / 100;

    const emi = Math.round(
      (principalRequested * r * Math.pow(1 + r, n)) /
      (Math.pow(1 + r, n) - 1)
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
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const { status } = req.body;

    // 🔹 When Admin approves
    if (status === "Approved") {
      loan.status = "Approved";
      await Student.findByIdAndUpdate(loan.studentId, { loanStatus: "Approved" });
    }

    // 🔹 When Admin disburses
    if (status === "Disbursed") {
      loan.status = "Disbursed";
      loan.disbursementDate = new Date();

      await Student.findByIdAndUpdate(loan.studentId, { loanStatus: "Active" });
    }

    // 🔹 When Admin rejects
    if (status === "Rejected") {
      loan.status = "Rejected";
      await Student.findByIdAndUpdate(loan.studentId, { loanStatus: "Rejected" });
    }

    Object.assign(loan, req.body);
    await loan.save();

    res.json({ success: true, data: loan });
  } catch (err) {
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

    await Student.findByIdAndUpdate(loan.studentId, { loanStatus: "Not Applied" });

    res.json({ success: true, message: "Loan deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

