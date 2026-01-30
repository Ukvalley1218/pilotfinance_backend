import Loan from "../../models/loan.js";
import mongoose from "mongoose";

/**
 * @desc Create Loan (Triggered from Partner/User Panel)
 * Updated to handle Monthly EMI math for consistency.
 */
export const createLoan = async (req, res) => {
  try {
    const { userId, totalAmount, requestedAmount, period, interestRate } =
      req.body;
    const finalAmount = Number(totalAmount || requestedAmount);

    if (!userId || !finalAmount) {
      return res.status(400).json({
        success: false,
        message: "User ID and loan amount are required",
      });
    }

    // --- EMI AUTO-CALCULATION SYNC ---
    // This ensures consistency even if created outside the Student's LoanConfigure page
    const n = parseInt(period) || 12;
    const r = (Number(interestRate) || 2.5) / 100; // Monthly rate decimal

    // Monthly Reducing Balance Formula
    const emi =
      (finalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalWithInterest = Math.round(emi * n);

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + n);

    const loan = await Loan.create({
      ...req.body,
      totalAmount: finalAmount,
      totalWithInterest: req.body.totalWithInterest || totalWithInterest,
      monthlyPayment: req.body.monthlyPayment || Math.round(emi),
      interestRate: Number(interestRate) || 2.5,
      payoffDate: req.body.payoffDate || payoffDate,
      status: req.body.status || "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Loan application submitted successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Create Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during application",
    });
  }
};

/**
 * @desc Update Loan (Used by Admin for Approvals/Verification)
 */
export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan record not found",
      });
    }

    // Logic: Automatically set disbursement date when status is changed to Disbursed
    if (req.body.status === "Disbursed" && !req.body.disbursementDate) {
      req.body.disbursementDate = new Date();
    }

    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).populate("userId", "fullName email");

    return res.status(200).json({
      success: true,
      message: "Loan status updated successfully",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Update Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update loan status",
    });
  }
};

/**
 * @desc Get All Loans (Dynamic sync for Admin Dashboard)
 */
export const getAllLoans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status && status !== "All Status") filter.status = status;

    if (search) {
      filter.$or = [
        { loanId: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "desc" ? -1 : 1 };

    const loans = await Loan.find(filter)
      .populate("userId", "fullName email avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Loan.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
      },
      data: loans,
    });
  } catch (error) {
    console.error("Get Loans Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching applications",
    });
  }
};

/**
 * @desc Get Single Loan by ID
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("userId", "fullName email phone address avatar")
      .populate("partnerId", "companyName fullName email");

    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    return res.status(200).json({ success: true, data: loan });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Invalid Loan ID" });
  }
};

/**
 * @desc Delete Loan
 */
export const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Loan record deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error deleting record" });
  }
};
