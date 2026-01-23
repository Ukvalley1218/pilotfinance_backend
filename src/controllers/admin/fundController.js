import { Fund } from "../../models/fund.model.js";
import Transaction from "../../models/transaction.model.js";

/**
 * @desc Get all funds
 * @route GET /api/admin/funds
 */
export const getAllFunds = async (req, res) => {
  try {
    const funds = await Fund.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: funds });
  } catch (error) {
    console.error("Fetch Funds Error:", error);
    res.status(500).json({ success: false, message: "Error fetching funds" });
  }
};

/**
 * @desc Add new fund and update Ledger
 * @route POST /api/admin/funds
 */
export const addFund = async (req, res) => {
  try {
    const { name, amount, category } = req.body;

    // 1. Basic Validation
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid fund amount is required" });
    }

    // 2. Create the Fund record
    const fund = await Fund.create({
      name,
      amount,
      category,
      status: "Active",
    });

    // 3. AUTOMATION: Create a corresponding Transaction entry (Credit)
    // This ensures your Finance Dashboard balance updates automatically!
    await Transaction.create({
      id: `TXN-FUND-${Date.now().toString().slice(-4)}`,
      type: "Credit",
      desc: `Capital Inflow: ${name || "New Fund"}`,
      subDesc: `Category: ${category || "General"}`,
      amount: amount,
      status: "Completed",
    });

    res.status(201).json({
      success: true,
      message: "Fund added and Ledger updated",
      data: fund,
    });
  } catch (error) {
    console.error("Add Fund Error:", error);
    res.status(400).json({ success: false, message: "Invalid fund data" });
  }
};
