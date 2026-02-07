import { Fund } from "../../models/fund.model.js";
import Transaction from "../../models/transaction.model.js";

/**
 * @desc Get all funds
 * @route GET /api/admin/funds
 */
export const getAllFunds = async (req, res) => {
  try {
    const funds = await Fund.find().sort({ createdAt: -1 });

    res.json({ success: true, data: funds });
  } catch (error) {
    console.error("Fetch Funds Error:", error);
    res.status(500).json({ message: "Error fetching funds" });
  }
};


/**
 * @desc Add new fund and update Ledger
 * @route POST /api/admin/funds
 */
export const addFund = async (req, res) => {
  try {
    const { name, amount, category } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid fund amount required" });
    }

    // 1️⃣ Save Fund Source
    const fund = await Fund.create({
      name: name || "Capital Injection",
      amount,
      category: category || "General",
      status: "Active",
      addedBy: req.user.id,
    });

    // 2️⃣ Create Ledger Transaction (Platform Credit)
    await Transaction.create({
      id: `TXN-FUND-${Date.now()}`,
      type: "Credit",
      desc: `Platform Fund Added`,
      subDesc: `${name || "General Fund"} (${category || "General"})`,
      amount,
      status: "Completed",
      meta: { source: "Admin Fund Injection" },
    });

    res.status(201).json({
      success: true,
      message: "Fund added and platform ledger updated",
      data: fund,
    });
  } catch (error) {
    console.error("Add Fund Error:", error);
    res.status(500).json({ message: "Failed to add fund" });
  }
};

