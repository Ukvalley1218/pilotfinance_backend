import Loan from "../../models/loan.js";
import mongoose from "mongoose";

// @desc    Submit a new loan request
// @route   POST /api/loans/request
export const submitLoanRequest = async (req, res) => {
  try {
    // 1. Check if auth middleware successfully populated req.user
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, msg: "Auth failed. No User ID." });
    }

    const { title, category, totalAmount, period, lastFourDigits } = req.body;
    const userId = req.user.id;

    // 2. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid User ID format." });
    }

    // 3. PROFESSIONAL GUARD: Only prevent if the SAME category is already pending
    // This allows a user to have a 'Car' loan and an 'Education' loan pending at the same time.
    const existingPending = await Loan.findOne({
      userId,
      category, // Filter specifically by the category they are applying for
      status: "Pending",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        msg: `You already have a pending ${category} loan application. Please wait for approval before applying for another ${category} loan.`,
      });
    }

    // 4. Calculations
    const months = parseInt(period) || 12;
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    const amountNum = Number(totalAmount);

    if (isNaN(amountNum)) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid amount provided." });
    }

    const monthlyPayment = Math.round(amountNum / months);

    // 5. Create New Loan
    const newLoan = new Loan({
      userId,
      title: title || `${category} Loan Request`,
      category: category || "Personal",
      totalAmount: amountNum,
      paidAmount: 0,
      monthlyPayment,
      period: `${months} Months`,
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
    if (err.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, msg: "Data format error." });
    }
    console.error("🔥 LOAN SUBMISSION ERROR:", err);
    res.status(500).json({ success: false, msg: "Internal Server Error" });
  }
};

// @desc    Get ONLY the loans for the logged-in user
export const getUserLoans = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, msg: "Unauthorized access" });
    }

    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, msg: "Invalid User ID." });
    }

    const loans = await Loan.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: loans.length,
      data: loans,
    });
  } catch (err) {
    console.error("🔥 FETCH LOANS ERROR:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error fetching loan history" });
  }
};
