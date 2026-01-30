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
    const userId = req.user.id;

    // Parallel fetching for performance
    const [student, loans, dbTransactions] = await Promise.all([
      Student.findOne({ userId }),
      Loan.find({ userId }).sort({ createdAt: -1 }),
      Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10),
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

    // --- FINANCIAL CALCULATIONS ---
    let grandTotalRemainingDebt = 0; // Current remaining balance
    let grandTotalOriginalDebt = 0; // Initial total including interest
    let grandTotalPaid = 0; // Total amount paid off

    const processedLoans = loans.map((loan) => {
      const remaining = loan.totalAmount || 0;
      const paid = loan.paidAmount || 0;
      const original = loan.totalWithInterest || remaining + paid;

      // We only sum financial metrics for non-pending loans
      const isLive = ["Approved", "Active", "Disbursed", "Completed"].includes(
        loan.status,
      );

      if (isLive) {
        grandTotalRemainingDebt += remaining;
        grandTotalPaid += paid;
        grandTotalOriginalDebt += original;
      }

      // Calculate progress for each specific loan in the list
      const individualProgress =
        original > 0 ? Math.round((paid / original) * 100) : 0;

      return {
        _id: loan._id, // Database ID for navigation to Pay Off page
        id: loan.loanId,
        loanType: loan.title || `${loan.category} Loan`,
        category: loan.category,
        status: loan.status,
        amount: remaining, // Current balance shown in portfolio
        totalWithInterest: original,
        paidAmount: paid,
        monthlyPayment: loan.monthlyPayment,
        progress: individualProgress,
        period: loan.period,
      };
    });

    // Calculate Overall Progress Percentage (The Yellow Circle)
    const overallProgress =
      grandTotalOriginalDebt > 0
        ? Math.round((grandTotalPaid / grandTotalOriginalDebt) * 100)
        : 0;

    const formattedDate = student.updatedAt
      ? new Date(student.updatedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

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
        totalLoanAmount: grandTotalRemainingDebt, // Sum of remaining balances (e.g. $8,000)
        overallProgress, // Based on original debt vs paid
        activeLoansCount: processedLoans.filter((l) => l.status !== "Pending")
          .length,
        payoffDate: formattedDate,
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
    const userId = req.user.id;
    const student = await Student.findOne({ userId });

    if (!student) {
      return res.status(200).json({ success: true, notifications: [] });
    }

    const notifications = [
      {
        _id: "notif_status_1",
        type: "status",
        title: "Application Status",
        message: `Your loan application is currently: ${student.status || "In Review"}`,
        time: student.updatedAt || new Date(),
        read: false,
      },
      {
        _id: "notif_kyc_1",
        type: "kyc",
        title: "KYC Verification",
        message:
          student.kycStatus === "Verified"
            ? "Your identity documents have been verified."
            : student.kycStatus === "Pending"
              ? "Your documents are currently under review."
              : "Please complete your KYC upload.",
        time: student.updatedAt || new Date(),
        read: false,
      },
    ];

    res.status(200).json({
      success: true,
      notifications: notifications,
    });
  } catch (err) {
    console.error("Notification Fetch Error:", err);
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};
