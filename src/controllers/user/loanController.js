import Loan from "../../models/loan.js";
import Transaction from "../../models/transaction.model.js";
import mongoose from "mongoose";

// --- 1. SUBMIT LOAN REQUEST ---
/**
 * @desc    Submit a new loan request (Stores Principal & Total Debt separately)
 * @route   POST /api/loans/request
 */
export const submitLoanRequest = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, msg: "Auth failed. No User ID." });
    }

    const {
      title,
      category,
      totalAmount, // This is the Principal (e.g., 10,500)
      period,
      interestRate,
      monthlyPayment: frontendMonthlyPayment,
      lastFourDigits,
    } = req.body;

    const userId = req.user.id;

    // Category Guard: Prevent multiple pending applications for same type
    const existingPending = await Loan.findOne({
      userId,
      category,
      status: "Pending",
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        msg: `You already have a pending ${category} loan application.`,
      });
    }

    // EMI CALCULATIONS
    const n = parseInt(period) || 12;
    const P = Number(totalAmount); // Principal requested
    const r = (interestRate || 2.5) / 100;

    if (isNaN(P)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid amount provided." });
    }

    const emiFormula = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const finalMonthlyPayment = Math.round(
      frontendMonthlyPayment || emiFormula,
    );
    const totalDebtIncludingInterest = Math.round(finalMonthlyPayment * n);

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + n);

    const newLoan = new Loan({
      userId,
      title: title || `${category} Loan Request`,
      category: category || "Education",

      // --- THE LOGIC Snapshot ---
      principalRequested: P, // PERMANENT: e.g. $10,500
      totalWithInterest: totalDebtIncludingInterest, // PERMANENT: e.g. $13,500
      totalAmount: totalDebtIncludingInterest, // LIVE: Decreases as student pays

      paidAmount: 0,
      monthlyPayment: finalMonthlyPayment,
      interestRate: interestRate || 2.5,
      period: `${n} Months`,
      payoffDate,
      lastFourDigits: lastFourDigits || "0000",
      status: "Pending",
    });

    await newLoan.save();

    res.status(201).json({
      success: true,
      msg: `${category} loan application submitted successfully!`,
      loan: newLoan,
    });
  } catch (err) {
    console.error("🔥 LOAN SUBMISSION ERROR:", err);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};

// --- 2. GET USER LOANS ---
/**
 * @desc    Fetch loan history for the logged-in user
 */
export const getUserLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, count: loans.length, data: loans });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, msg: "Error fetching loan history" });
  }
};

// --- 3. GET LOAN BY ID ---
/**
 * @desc    Fetch a single loan's details for repayment calculations
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan)
      return res.status(404).json({ success: false, msg: "Loan not found" });
    res.status(200).json({ success: true, loan });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server Error" });
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

    const loan = await Loan.findById(loanId);
    if (!loan)
      return res
        .status(404)
        .json({ success: false, msg: "Loan record not found" });

    // 1. Update Paid Amount (Increments: 0 -> 8500 -> 10500)
    loan.paidAmount += paymentAmount;

    // 2. MATH FIX: Update Remaining Balance
    // Balance = (Permanent Total Debt) - (Total Amount Paid)
    // This ensures totalAmount correctly hits $0 without affecting principalRequested
    loan.totalAmount = Math.max(0, loan.totalWithInterest - loan.paidAmount);

    // 3. Status handling
    if (loan.totalAmount <= 0) {
      loan.status = "Completed";
    }

    await loan.save();

    // Create a Transaction record
    await Transaction.create({
      id: `TXN-PAY-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: req.user.id,
      type: "Debit",
      amount: paymentAmount,
      desc: `Repayment for ${loan.category} Loan`,
      status: "Completed",
    });

    res.status(200).json({
      success: true,
      msg: "Payment successful",
      remainingBalance: loan.totalAmount, // Sends 0 if paid off
    });
  } catch (err) {
    console.error("🔥 REPAYMENT ERROR:", err);
    res
      .status(500)
      .json({ success: false, msg: "Repayment processing failed" });
  }
};
