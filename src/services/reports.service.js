import Loan from "../models/loan.js";
import { Partner } from "../models/partner.model.js";
import { Student } from "../models/student.model.js";

import mongoose from "mongoose";

export const generateReportData = async (filters) => {
  const { startDate, endDate, partner, loanType, status } = filters;

  const query = {};

  // 📅 Date filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // 📌 Status filter
  if (status && status !== "All Status") query.status = status;

  // 📌 Loan Type (category in schema)
  if (loanType && loanType !== "All Types") query.category = loanType;

  // 📌 Partner filter
  if (partner && partner !== "All Partners")
    query.partnerId = new mongoose.Types.ObjectId(partner);

  const loans = await Loan.find(query)
    .populate("userId", "fullName email")
    .populate("partnerId", "name");

  // 📊 STATS
  const totalFunds = loans
    .filter(l => ["Disbursed", "Active", "Completed"].includes(l.status))
    .reduce((acc, l) => acc + (l.principalRequested || 0), 0);

  const activePartners = await Partner.countDocuments({ status: "Active" });
  const activeStudents = await Student.countDocuments({ kycStatus: "Verified" });
  const pendingRequests = loans.filter(l => l.status === "Pending").length;

  // 📋 TABLE DATA
  const table = loans.map(l => ({
    id: l.loanId,
    date: l.createdAt,
    type: l.category,
    name: l.userId?.fullName || "N/A",
    partner: l.partnerId?.name || "Direct",
    amount: l.principalRequested,
    status: l.status,
  }));

  // 📊 BAR CHART
  const barChart = [
    { name: "Applications", value: loans.length },
    { name: "Approved", value: loans.filter(l => l.status === "Approved").length },
    { name: "Active", value: loans.filter(l => l.status === "Active").length },
  ];

  // 🥧 PIE CHART WITH COLORS
  const pieChart = [
    {
      name: "Approved",
      value: loans.filter(l => l.status === "Approved").length,
      color: "#22c55e",
    },
    {
      name: "Pending",
      value: loans.filter(l => l.status === "Pending").length,
      color: "#facc15",
    },
    {
      name: "Rejected",
      value: loans.filter(l => l.status === "Rejected").length,
      color: "#ef4444",
    },
  ];

  return {
    stats: {
      totalFunds,
      loansApplied: loans.length,
      activePartners,
      activeStudents,
      pendingRequests,
    },
    table,
    barChart,
    pieChart,
  };
};
