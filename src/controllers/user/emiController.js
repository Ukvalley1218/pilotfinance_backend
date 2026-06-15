import EMISchedule from "../../models/emiSchedule.model.js";
import Loan from "../../models/loan.js";
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

    // Use the loan's monthlyPayment (what was shown to user and agreed upon)
    // DO NOT recalculate - the user agreed to this amount when requesting the loan
    const emiAmount = loan.monthlyPayment;

    if (!emiAmount || emiAmount <= 0) {
      console.error('Loan missing monthlyPayment, falling back to calculation');
      // Fallback to calculation if monthlyPayment is not set
      const fallbackEmi = calculateEMI(
        loan.principalRequested,
        loan.interestRate,
        tenure
      );
      // This should not happen in normal flow
    }

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
 * @desc    Get auto-debit status for all loans
 * @route   GET /api/emi/auto-debit-status
 * @access  Private (Student)
 */
export const getAutoDebitStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find student - req.user from User Panel login IS a Student document
    // So userId here is the Student's _id, not a userId field
    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student profile not found",
      });
    }

    // Get all active loans for this student
    const loans = await Loan.find({
      studentId: student._id,
      status: { $in: ["Disbursed", "Active"] },
    }).sort({ createdAt: -1 });

    // Get payment methods
    const paymentMethods = await PaymentMethod.find({
      studentId: student._id,
      isActive: true,
    }).sort({ isDefault: -1, createdAt: -1 });

    const defaultPaymentMethod = paymentMethods.find((pm) => pm.isDefault);

    // Get EMI summary for each loan
    const loanSummaries = await Promise.all(
      loans.map(async (loan) => {
        const emiSchedule = await EMISchedule.find({ loanId: loan._id }).sort({
          installmentNumber: 1,
        });

        const paidEMIs = emiSchedule.filter((e) => e.status === "paid").length;
        const pendingEMIs = emiSchedule.filter(
          (e) => e.status === "pending" || e.status === "overdue"
        ).length;
        const nextEMI = emiSchedule.find(
          (e) => e.status === "pending" || e.status === "overdue"
        );

        return {
          loanId: loan._id,
          loanRef: loan.loanId,
          category: loan.category,
          status: loan.status,
          totalAmount: loan.totalWithInterest,
          paidAmount: loan.paidAmount,
          monthlyPayment: loan.monthlyPayment,
          autoDebitEnabled: loan.autoDebitEnabled,
          autoDebitStatus: loan.autoDebitStatus,
          nextPaymentDueDate: loan.nextPaymentDueDate,
          totalEMIs: emiSchedule.length,
          paidEMIs,
          pendingEMIs,
          nextEMIAmount: nextEMI?.amount || 0,
          nextEMIDueDate: nextEMI?.dueDate || null,
          hasDefaultPaymentMethod: !!defaultPaymentMethod,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        loans: loanSummaries,
        paymentMethods: paymentMethods.map((pm) => ({
          id: pm._id,
          last4: pm.last4,
          brand: pm.brand,
          expMonth: pm.expMonth,
          expYear: pm.expYear,
          isDefault: pm.isDefault,
        })),
        hasDefaultPaymentMethod: !!defaultPaymentMethod,
      },
    });
  } catch (error) {
    console.error("Get auto-debit status error:", error);
    res.status(500).json({
      success: false,
      msg: "Failed to get auto-debit status",
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

    // Find student - req.user from User Panel login IS a Student document
    // So userId here is the Student's _id, not a userId field
    const student = await Student.findById(userId);
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

    // Check if at least one EMI has been paid (first payment made)
    const paidEMIs = await EMISchedule.countDocuments({
      loanId: loan._id,
      status: "paid",
    });

    if (enabled && paidEMIs === 0) {
      return res.status(400).json({
        success: false,
        msg: "Please make your first EMI payment before enabling auto-debit",
        requiresFirstPayment: true,
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
          requiresPaymentMethod: true,
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

export default {
  generateEMISchedule,
  getAutoDebitStatus,
  toggleAutoDebit,
};