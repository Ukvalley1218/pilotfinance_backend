import { Student } from "../../models/student.model.js";

// --- 1. GET DASHBOARD DATA ---
/**
 * @desc    Fetch student metrics, active loans, and recent transactions
 * @route   GET /api/dashboard
 */
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the student linked to this user
    const student = await Student.findOne({ userId });

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

    // Initialize variables for calculation
    let totalLoanAmount = 0;
    let overallProgress = 0;
    let activeLoans = [];

    const loanAmt = student.requestedAmount || student.totalAmount || 0;

    if (student.status === "Approved" && loanAmt > 0) {
      totalLoanAmount = loanAmt;

      // Progress Tracking
      const paidAmount = student.paidAmount || 0;
      overallProgress =
        totalLoanAmount > 0
          ? Math.round((paidAmount / totalLoanAmount) * 100)
          : 0;

      activeLoans = [
        {
          id: student.appId || student._id.toString().slice(-6).toUpperCase(),
          name: student.loanType || "Education Loan",
          period: student.duration || "Active Term",
          amount: totalLoanAmount,
          progress: overallProgress,
        },
      ];
    } else if (student.status === "Pending") {
      totalLoanAmount = loanAmt;
      overallProgress = 0;
      activeLoans = [
        {
          id: student.appId || student._id.toString().slice(-6).toUpperCase(),
          name: student.loanType || "Education Loan",
          period: "Approval Pending",
          amount: totalLoanAmount,
          progress: 0,
        },
      ];
    }

    // --- RECENT TRANSACTIONS LOGIC ---
    // Note: You can replace this with a query to a 'Transaction' collection later
    // Example: const transactions = await Transaction.find({ studentId: student._id }).limit(5);
    const recentTransactions = [
      {
        id: "TXN-" + Math.floor(1000 + Math.random() * 9000),
        type: "Initial Deposit",
        amount: totalLoanAmount > 0 ? 500.0 : 0,
        status: "Completed",
        date: new Date().toISOString(),
      },
      {
        id: "TXN-" + Math.floor(1000 + Math.random() * 9000),
        type: "Processing Fee",
        amount: totalLoanAmount > 0 ? 45.0 : 0,
        status: "Processed",
        date: new Date().toISOString(),
      },
    ].filter((t) => t.amount > 0); // Only show if there is an actual loan amount

    const formattedDate = student.updatedAt
      ? new Date(student.updatedAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    // Combined Response for Frontend
    res.status(200).json({
      success: true,
      data: {
        totalLoanAmount,
        overallProgress,
        activeLoansCount: activeLoans.length,
        payoffDate: formattedDate,
        loans: activeLoans,
        transactions: recentTransactions, // New field for the UI table
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
