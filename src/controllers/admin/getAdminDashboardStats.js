import User from "../../models/User.js";
import { Student } from "../../models/student.model.js";
import Loan from "../../models/loan.js";

export const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      activePartners,
      pendingPartners,
      totalStudents,
      studentsPendingKyc,
      activeLoans,
      pendingLoans,
      disbursedAmount,
    ] = await Promise.all([
      User.countDocuments({ role: "Partner", status: "Active" }),
      User.countDocuments({ role: "Partner", kycStatus: "Pending" }),
      Student.countDocuments(),
      Student.countDocuments({ kycStatus: "Pending" }),
      Loan.countDocuments({ status: { $in: ["Active", "Disbursed"] } }),
      Loan.countDocuments({ status: { $in: ["Requested", "Pending"] } }),
      Loan.aggregate([
        { $match: { status: { $in: ["Disbursed", "Active", "Completed"] } } },
        { $group: { _id: null, total: { $sum: "$principalRequested" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        partners: {
          active: activePartners,
          pendingKyc: pendingPartners,
        },
        students: {
          total: totalStudents,
          pendingKyc: studentsPendingKyc,
        },
        loans: {
          active: activeLoans,
          pendingApproval: pendingLoans,
          totalDisbursed: disbursedAmount[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
};
