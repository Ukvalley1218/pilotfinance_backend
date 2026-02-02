import { Partner } from "../../models/partner.model.js";
import { Student } from "../../models/student.model.js";
import Loan from "../../models/loan.js";

/**
 * @desc Admin Dashboard Statistics
 * @route GET /api/admin/dashboard/stats
 */
export const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      activePartners,
      pendingPartners,
      inactivePartners,
      totalStudents,
      totalLoans,
    ] = await Promise.all([
      Partner.countDocuments({ status: "Active" }),
      Partner.countDocuments({ status: "Pending" }),
      Partner.countDocuments({ status: "Inactive" }),
      Student.countDocuments(),
      Loan.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        active: activePartners,
        pending: pendingPartners,
        inactive: inactivePartners,
        totalStudents,
        totalLoans,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
};