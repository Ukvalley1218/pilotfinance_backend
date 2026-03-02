import EMISchedule from "../../models/emiSchedule.model.js";
import Loan from "../../models/loan.js";
import Transaction from "../../models/transaction.model.js";
import { Student } from "../../models/student.model.js";
import PaymentMethod from "../../models/paymentMethod.model.js";

/**
 * Calculate monthly EMI amount
 * @param {number} principal - Principal amount
 * @param {number} annualRate - Annual interest rate (percentage)
 * @param {number} tenure - Loan tenure in months
 * @returns {number} - Monthly EMI amount
 */
const calculateEMI = (principal, annualRate, tenure) => {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / tenure;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
               (Math.pow(1 + monthlyRate, tenure) - 1);
  return Math.round(emi * 100) / 100;
};

/**
 * Generate EMI schedule when loan is disbursed
 * @param {Object} loan - Loan document
 * @returns {Promise<Array>} - Array of EMI schedule documents
 */
export const generateEMISchedule = async (loan) => {
  try {
    // Get tenure from period string (e.g., "12 Months" -> 12)
    const tenureMatch = loan.period.match(/(\d+)/);
    const tenure = tenureMatch ? parseInt(tenureMatch[1]) : 12;

    // Calculate EMI amount
    const emiAmount = calculateEMI(
      loan.principalRequested,
      loan.interestRate,
      tenure
    );

    // Calculate disbursement date (use current date if not set)
    const disbursementDate = loan.disbursementDate ? new Date(loan.disbursementDate) : new Date();

    // Generate EMI installments
    const emiSchedules = [];
    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date(disbursementDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(dueDate.getDate() - 1); // Due on the day before the anniversary

      emiSchedules.push({
        loanId: loan._id,
        studentId: loan.studentId,
        installmentNumber: i,
        amount: emiAmount,
        dueDate: dueDate,
        status: "pending",
        retryCount: 0,
        maxRetries: 3,
      });
    }

    // Save all EMI schedules
    const savedSchedules = await EMISchedule.insertMany(emiSchedules);

    // Update loan with next payment due date
    if (savedSchedules.length > 0) {
      loan.nextPaymentDueDate = savedSchedules[0].dueDate;
      await loan.save();
    }

    return savedSchedules;
  } catch (error) {
    console.error("Error generating EMI schedule:", error);
    throw error;
  }
};

/**
 * @desc    Get EMI schedule for a loan
 * @route   GET /api/emi/schedule/:loanId
 * @access  Private (Student)
 */
export const getEMISchedule = async (req, res) => {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Verify loan belongs to student
    const loan = await Loan.findOne({ _id: loanId, studentId: student._id });
    if (!loan) {
      return res.status(404).json({
        success: false,
        msg: "Loan not found",
      });
    }

    // Get EMI schedule
    const emiSchedules = await EMISchedule.find({ loanId })
      .sort({ installmentNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        loan: {
          loanId: loan.loanId,
          status: loan.status,
          totalWithInterest: loan.totalWithInterest,
          paidAmount: loan.paidAmount,
          principalRequested: loan.principalRequested,
          autoDebitEnabled: loan.autoDebitEnabled,
          autoDebitStatus: loan.autoDebitStatus,
        },
        emiSchedules: emiSchedules.map((emi) => ({
          id: emi._id,
          installmentNumber: emi.installmentNumber,
          amount: emi.amount,
          totalAmount: emi.totalAmount || emi.amount,
          dueDate: emi.dueDate,
          status: emi.status,
          paidAt: emi.paidAt,
          isOverdue: emi.isOverdue,
          daysOverdue: emi.daysOverdue,
          lateFee: emi.lateFee || 0,
          retryCount: emi.retryCount,
        })),
      },
    });
  } catch (error) {
    console.error("Get EMI schedule error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to get EMI schedule",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle auto-debit for a loan
 * @route   POST /api/emi/toggle-autodebit/:loanId
 * @access  Private (Student)
 */
export const toggleAutoDebit = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { enabled } = req.body;
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Verify loan belongs to student
    const loan = await Loan.findOne({ _id: loanId, studentId: student._id });
    if (!loan) {
      return res.status(404).json({
        success: false,
        msg: "Loan not found",
      });
    }

    // Check if loan is disbursed
    if (loan.status !== "Disbursed" && loan.status !== "Active") {
      return res.status(400).json({
        success: false,
        msg: "Auto-debit can only be enabled for active loans",
      });
    }

    if (enabled) {
      // Check if student has a default payment method
      const defaultPaymentMethod = await PaymentMethod.findOne({
        studentId: student._id,
        isDefault: true,
        isActive: true,
      });

      if (!defaultPaymentMethod) {
        return res.status(400).json({
          success: false,
          msg: "Please add a payment method and set it as default before enabling auto-debit",
        });
      }

      loan.autoDebitEnabled = true;
      loan.defaultPaymentMethod = defaultPaymentMethod._id;
      loan.autoDebitStatus = "active";
    } else {
      loan.autoDebitEnabled = false;
      loan.autoDebitStatus = "inactive";
    }

    await loan.save();

    res.status(200).json({
      success: true,
      msg: enabled ? "Auto-debit enabled successfully" : "Auto-debit disabled successfully",
      data: {
        autoDebitEnabled: loan.autoDebitEnabled,
        autoDebitStatus: loan.autoDebitStatus,
        defaultPaymentMethod: loan.defaultPaymentMethod,
      },
    });
  } catch (error) {
    console.error("Toggle auto-debit error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to toggle auto-debit",
      error: error.message,
    });
  }
};

/**
 * @desc    Manual EMI payment
 * @route   POST /api/emi/pay/:emiId
 * @access  Private (Student)
 */
export const manualPayEMI = async (req, res) => {
  try {
    const { emiId } = req.params;
    const { paymentMethodId, paymentIntentId } = req.body;
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Find EMI schedule
    const emi = await EMISchedule.findById(emiId).populate("loanId");
    if (!emi) {
      return res.status(404).json({
        success: false,
        msg: "EMI schedule not found",
      });
    }

    // Verify EMI belongs to student
    if (emi.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to pay this EMI",
      });
    }

    // Check if already paid
    if (emi.status === "paid") {
      return res.status(400).json({
        success: false,
        msg: "EMI already paid",
      });
    }

    // Get payment method
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod || paymentMethod.studentId.toString() !== student._id.toString()) {
      return res.status(400).json({
        success: false,
        msg: "Invalid payment method",
      });
    }

    // Calculate total amount (EMI + late fee if overdue)
    let totalAmount = emi.amount;
    if (emi.isOverdue) {
      // Add late fee (e.g., 1% of EMI amount per day overdue, max 10%)
      const lateFeePercentage = Math.min(emi.daysOverdue * 0.01, 0.1);
      emi.lateFee = Math.round(emi.amount * lateFeePercentage * 100) / 100;
      totalAmount = emi.amount + emi.lateFee;
    }
    emi.totalAmount = totalAmount;

    // Update EMI status
    emi.status = "paid";
    emi.paidAt = new Date();
    emi.paymentMethodId = paymentMethodId;
    emi.stripePaymentIntentId = paymentIntentId || null;

    // Create transaction
    const transaction = await Transaction.create({
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: userId,
      studentId: student._id,
      type: "Debit",
      desc: `EMI Payment - Installment ${emi.installmentNumber}`,
      subDesc: `Loan Ref: ${emi.loanId.loanId}`,
      amount: totalAmount,
      status: "Completed",
    });

    emi.transactionId = transaction._id;
    await emi.save();

    // Update loan paid amount
    const loan = await Loan.findById(emi.loanId._id);
    loan.paidAmount += totalAmount;

    // Check if loan is completed
    if (loan.paidAmount >= loan.totalWithInterest - 0.5) {
      loan.status = "Completed";
      loan.paidAmount = loan.totalWithInterest;
    }

    await loan.save();

    res.status(200).json({
      success: true,
      msg: "EMI payment successful",
      data: {
        emiId: emi._id,
        amount: totalAmount,
        paidAt: emi.paidAt,
        transactionId: transaction.id,
        loanStatus: loan.status,
        loanPaidAmount: loan.paidAmount,
      },
    });
  } catch (error) {
    console.error("Manual EMI payment error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to process EMI payment",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all EMI schedules for a student
 * @route   GET /api/emi/all
 * @access  Private (Student)
 */
export const getAllEMISchedules = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Get all EMI schedules for this student
    const emiSchedules = await EMISchedule.find({ studentId: student._id })
      .populate("loanId", "loanId status category monthlyPayment")
      .sort({ dueDate: 1 });

    // Group by loan
    const groupedByLoan = {};
    emiSchedules.forEach((emi) => {
      const loanId = emi.loanId._id.toString();
      if (!groupedByLoan[loanId]) {
        groupedByLoan[loanId] = {
          loanId: loanId,
          loanRef: emi.loanId.loanId,
          status: emi.loanId.status,
          category: emi.loanId.category,
          monthlyPayment: emi.loanId.monthlyPayment,
          emiSchedules: [],
        };
      }
      groupedByLoan[loanId].emiSchedules.push({
        id: emi._id,
        installmentNumber: emi.installmentNumber,
        amount: emi.amount,
        totalAmount: emi.totalAmount || emi.amount,
        dueDate: emi.dueDate,
        status: emi.status,
        paidAt: emi.paidAt,
        isOverdue: emi.isOverdue,
        daysOverdue: emi.daysOverdue,
        lateFee: emi.lateFee || 0,
      });
    });

    res.status(200).json({
      success: true,
      data: Object.values(groupedByLoan),
    });
  } catch (error) {
    console.error("Get all EMI schedules error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to get EMI schedules",
      error: error.message,
    });
  }
};

/**
 * @desc    Get EMI details
 * @route   GET /api/emi/:emiId
 * @access  Private (Student)
 */
export const getEMIDetails = async (req, res) => {
  try {
    const { emiId } = req.params;
    const userId = req.user.id;

    // Find student
    const student = await Student.findOne({ userId });
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Find EMI
    const emi = await EMISchedule.findById(emiId)
      .populate("loanId")
      .populate("paymentMethodId");

    if (!emi) {
      return res.status(404).json({
        success: false,
        msg: "EMI schedule not found",
      });
    }

    // Verify EMI belongs to student
    if (emi.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: emi._id,
        installmentNumber: emi.installmentNumber,
        amount: emi.amount,
        totalAmount: emi.totalAmount || emi.amount,
        dueDate: emi.dueDate,
        status: emi.status,
        paidAt: emi.paidAt,
        isOverdue: emi.isOverdue,
        daysOverdue: emi.daysOverdue,
        lateFee: emi.lateFee || 0,
        retryCount: emi.retryCount,
        loan: {
          id: emi.loanId._id,
          loanId: emi.loanId.loanId,
          status: emi.loanId.status,
          category: emi.loanId.category,
        },
        paymentMethod: emi.paymentMethodId ? {
          id: emi.paymentMethodId._id,
          last4: emi.paymentMethodId.last4,
          brand: emi.paymentMethodId.brand,
        } : null,
      },
    });
  } catch (error) {
    console.error("Get EMI details error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to get EMI details",
      error: error.message,
    });
  }
};

export default {
  generateEMISchedule,
  getEMISchedule,
  toggleAutoDebit,
  manualPayEMI,
  getAllEMISchedules,
  getEMIDetails,
};