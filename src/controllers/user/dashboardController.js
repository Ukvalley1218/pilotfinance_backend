import { Student } from "../../models/student.model.js";
import Loan from "../../models/loan.js";
import Transaction from "../../models/transaction.model.js";

// --- 1. GET DASHBOARD DATA ---
/**
 * @desc    Fetch student metrics, individual loans, and REAL database transactions
 * @route   GET /api/dashboard
 */
export const getDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id;
    console.log(studentId);
    
    const [student, loans, dbTransactions] = await Promise.all([
      Student.findById(studentId),
      Loan.find({ studentId }).sort({ createdAt: -1 }),
      Transaction.find({ studentId }).sort({ createdAt: -1 }).limit(10),
    ]);

    if (!student) {
      return res.status(200).json({
        success: true,
        data: {
          totalLoanAmount: 0,
          overallProgress: 0,
          activeLoansCount: 0,
          payoffDate: "N/A",
          loans: [],
          transactions: [],
        },
      });
    }

    let grandTotalRemainingDebt = 0;
    let grandTotalOriginalDebt = 0;
    let grandTotalPaid = 0;
    let remaining;

    const processedLoans = loans.map((loan) => {
      if(loan.status === "Disbursed"){
       remaining = loan.totalAmount || 0;

      }
      const paid = loan.paidAmount || 0;
      const original = loan.totalWithInterest || remaining + paid;

      const isLive = ["Approved", "Active", "Disbursed", "Completed"].includes(loan.status);

      if (isLive) {
        grandTotalRemainingDebt += remaining;
        grandTotalPaid += paid;
        grandTotalOriginalDebt += original;
      }

      return {
        _id: loan._id,
        id: loan.loanId,
        loanType: loan.title || `${loan.category} Loan`,
        category: loan.category,
        status: loan.status,
        amount: remaining,
        totalWithInterest: original,
        paidAmount: paid,
        monthlyPayment: loan.monthlyPayment,
        progress: original > 0 ? Math.round((paid / original) * 100) : 0,
        period: loan.period,
      };
    });

    const overallProgress =
      grandTotalOriginalDebt > 0
        ? Math.round((grandTotalPaid / grandTotalOriginalDebt) * 100)
        : 0;

    const transactionList = dbTransactions.map((txn) => ({
      id: txn.id,
      type: txn.desc,
      amount: txn.amount,
      status: txn.status,
      date: txn.createdAt,
      direction: txn.type,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalLoanAmount: grandTotalRemainingDebt,

        remainingamount:loans.reduce((sum, loan) => sum + (loan.totalAmount || 0), 0),
        overallProgress,
        activeLoansCount: processedLoans.filter((l) => l.status !== "Pending").length,
        payoffDate: student.updatedAt
          ? new Date(student.updatedAt).toLocaleDateString("en-GB")
          : "N/A",
        loans: processedLoans,
        transactions: transactionList,
      },
    });
  } catch (err) {
    console.error("Dashboard Sync Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. GET NOTIFICATIONS ---
/**
 * @desc    Generate dynamic notifications based on KYC and Application status
 * @route   GET /api/dashboard/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(200).json({ success: true, notifications: [] });
    }

    const notifications = [];

    // Loan status
    notifications.push({
      _id: "loan_status",
      type: "status",
      title: "Loan Application Status",
      message: `Your loan status is: ${student.loanStatus || "Not Applied"}`,
      time: student.updatedAt || new Date(),
      read: false,
    });

    // Overall KYC
    notifications.push({
      _id: "kyc_status",
      type: "kyc",
      title: "KYC Status",
      message:
        student.kycStatus === "Verified"
          ? "Your KYC has been fully verified."
          : student.kycStatus === "Partially Verified"
            ? "Some documents need attention."
            : "Your KYC is under review.",
      time: student.updatedAt || new Date(),
      read: false,
    });

    // 🔔 Individual document rejections
    Object.entries(student.kycDocuments || {}).forEach(([docType, doc]) => {
      if (doc.status === "Rejected") {
        notifications.push({
          _id: `kyc_reject_${docType}`,
          type: "kyc_reject",
          title: `${docType} Rejected`,
          message: doc.remark || "Please re-upload this document.",
          time: doc.verifiedAt || new Date(),
          read: false,
        });
      }
    });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (err) {
    console.error("Notification Fetch Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};


