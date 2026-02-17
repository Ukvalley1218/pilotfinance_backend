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

    let totalDisbursedAmount = 0;
    let totalOriginalWithInterest = 0;
    let totalPaid = 0;

    const processedLoans = loans.map((loan) => {

      const isDisbursed = ["Disbursed", "Active", "Completed"].includes(loan.status);

      const principal = loan.principalRequested || 0;
      const paid = loan.paidAmount || 0;
      const totalWithInterest = loan.totalWithInterest || 0;
      const remaining = Math.max(totalWithInterest - paid, 0);

      // ✅ Only count DISBURSED loans
      if (isDisbursed) {
        totalDisbursedAmount += principal;
        totalOriginalWithInterest += totalWithInterest;
        totalPaid += paid;
      }

      return {
        _id: loan._id,
        id: loan.loanId,
        loanType: loan.title || `${loan.category} Loan`,
        category: loan.category,
        status: loan.status,
        disbursedAmount: principal,
        remainingAmount: remaining,
        totalWithInterest,
        paidAmount: paid,
        monthlyPayment: loan.monthlyPayment,
        progress:
          totalWithInterest > 0
            ? Math.round((paid / totalWithInterest) * 100)
            : 0,
        period: loan.period,
      };
    });

    const overallProgress =
      totalOriginalWithInterest > 0
        ? Math.round((totalPaid / totalOriginalWithInterest) * 100)
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
        totalLoanAmount: totalDisbursedAmount, // ✅ FIXED
        overallProgress,
        activeLoansCount: processedLoans.filter((l) =>
          ["Disbursed", "Active"].includes(l.status)
        ).length,
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


