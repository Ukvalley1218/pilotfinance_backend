import Loan from "../../models/loan.js";

// --- 1. GET DASHBOARD DATA ---
// Calculates real-time totals and progress for the User Dashboard
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get ONLY Approved loans for the balance
    const approvedLoans = await Loan.find({ userId, status: "Approved" });

    // 2. Calculate Real-Time Totals
    const totalLoanAmount = approvedLoans.reduce(
      (acc, loan) => acc + (loan.totalAmount || 0),
      0
    );
    const totalPaid = approvedLoans.reduce(
      (acc, loan) => acc + (loan.paidAmount || 0),
      0
    );

    // 3. Overall progress for the ring chart (Your original logic)
    const overallProgress =
      totalLoanAmount > 0 ? Math.round((totalPaid / totalLoanAmount) * 100) : 0;

    // 4. Get latest payoff date
    const furthestLoan = await Loan.findOne({
      userId,
      status: "Approved",
    }).sort({ payoffDate: -1 });

    const formattedDate = furthestLoan
      ? new Date(furthestLoan.payoffDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    // 5. Response - Keeping your exact data structure
    res.status(200).json({
      totalLoanAmount,
      overallProgress,
      activeLoansCount: approvedLoans.length,
      payoffDate: formattedDate,
      loans: approvedLoans.map((loan) => ({
        id: loan._id,
        name: loan.title || "New Loan Application", // Mapping to your Master Model 'title'
        period: loan.period,
        amount: loan.totalAmount,
        progress:
          loan.totalAmount > 0
            ? Math.round((loan.paidAmount / loan.totalAmount) * 100)
            : 0,
      })),
    });
  } catch (err) {
    console.error("Dashboard Data Error:", err);
    res.status(500).json({ msg: "Server Error" });
  }
};

// --- 2. GET NOTIFICATIONS ---
// Provides status updates to the user regarding their application
export const getNotifications = async (req, res) => {
  try {
    // Keeping your exact mock data as requested for dynamic-readiness
    const notifications = [
      {
        type: "approval",
        title: "Loan Eligibility Checked",
        message: "Your profile has been processed for basic loan eligibility.",
        time: new Date(),
      },
      {
        type: "status",
        title: "Document Verification",
        message: "Your KYC documents are currently being reviewed by our team.",
        time: new Date(),
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
