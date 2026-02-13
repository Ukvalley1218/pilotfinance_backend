import Loan from "../../models/loan.js";
import { Student } from "../../models/student.model.js";
import Transaction from "../../models/transaction.model.js";
import mongoose from "mongoose";

// --- 1. SUBMIT LOAN REQUEST ---
/**
 * @desc    Submit a new loan request (Stores Principal & Total Debt separately)
 * @route   POST /api/loans/request
 */
export const submitLoanRequest = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    if (student.kycStatus !== "Approved") {
      return res.status(400).json({ msg: "Complete KYC before applying" });
    }

    const {
      title,
      category,
      totalAmount,
      period,
      interestRate,
      monthlyPayment,
      lastFourDigits,
    } = req.body;

    // Prevent multiple active loans
    const existingActiveLoan = await Loan.findOne({
      studentId,
      status: { $nin: ["Completed","Disbursed","Approved", "Rejected"] },
    });

    if (existingActiveLoan) {
      return res.status(400).json({
        msg: "You already have an active or pending loan",
      });
    }

    const n = parseInt(period) || 12;
    const P = Number(totalAmount);
    const r = (interestRate || 2.5) / 100;

    const emi = Math.round(
      monthlyPayment ||
      (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    );

    const totalDebt = emi * n;

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + n);

    const newLoan = await Loan.create({
      studentId,
      title: title || `${category} Loan Request`,
      category: category || "Education",
      principalRequested: P,
      totalWithInterest: totalDebt,
      totalAmount: totalDebt,
      paidAmount: 0,
      monthlyPayment: emi,
      interestRate: interestRate || 2.5,
      period: `${n} Months`,
      payoffDate,
      lastFourDigits,
      status: "Requested", // waits for Partner → Admin flow
    });

    // Update student loan lifecycle
    student.loanStatus = "Applied";
    await student.save();

    res.status(201).json({ success: true, loan: newLoan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Loan submission failed" });
  }
};


// --- 2. GET USER LOANS ---
/**
 * @desc    Fetch loan history for the logged-in user
 */
export const getUserLoans = async (req, res) => {
  try {
    const studentId = req.user.id;
    const loans = await Loan.find({ studentId }).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch {
    res.status(500).json({ msg: "Error fetching loans" });
  }
};


// --- 3. GET LOAN BY ID ---
/**
 * @desc    Fetch a single loan's details for repayment calculations
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      studentId: req.user.id,
    });

    if (!loan) return res.status(404).json({ msg: "Loan not found" });

    res.json({ success: true, loan });
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
};


// --- 4. REPAY LOAN (Logic Fix for $0 Display Bug) ---
/**
 * @desc    Process a repayment, updates balance while preserving the Principal snapshot
 */
export const repayLoan = async (req, res) => {
  try {
    const { loanId, amount } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ msg: "Invalid payment amount" });
    }

    const loan = await Loan.findOne({
      _id: loanId,
      studentId: req.user.id,
    }).populate("studentId");

    if (!loan) return res.status(404).json({ msg: "Loan not found" });

    // Update loan balances
    loan.paidAmount += paymentAmount;
    loan.totalAmount = Math.max(0, loan.totalWithInterest - loan.paidAmount);

    if (loan.totalAmount <= 0) {
      loan.status = "Completed";
      await Student.findByIdAndUpdate(req.user.id, { loanStatus: "Completed" });
    }

    await loan.save();

    // 🔥 CREATE TRANSACTION (REPAYMENT DEBIT)
    await Transaction.create({
      id: `TXN-PAY-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: loan.studentId.userId || loan.studentId._id, // wallet owner
      studentId: loan.studentId._id,
      type: "Debit",
      desc: `Repayment for ${loan.category} Loan`,
      subDesc: `Loan Ref: ${loan._id}`,
      amount: paymentAmount,
      status: "Completed",
    });

    res.json({
      success: true,
      remainingBalance: loan.totalAmount,
    });
  } catch (err) {
    console.error("Repayment Error:", err);
    res.status(500).json({ msg: "Repayment failed" });
  }
};


