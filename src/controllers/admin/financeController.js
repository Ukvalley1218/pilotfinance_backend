import Transaction from "../../models/transaction.model.js";

// 1. GET LEDGER
export const getLedger = async (req, res) => {
  try {
    const { type, from, to } = req.query;
    const filter = {};

    if (type) filter.type = type; // Credit or Debit
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching ledger" });
  }
};


// 2. GET BALANCE
export const getBalance = async (req, res) => {
  try {
    const credits = await Transaction.aggregate([
      { $match: { type: "Credit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const debits = await Transaction.aggregate([
      { $match: { type: "Debit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const balance =
      (credits[0]?.total || 0) - (debits[0]?.total || 0);

    res.status(200).json({ success: true, amount: balance });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error calculating balance" });
  }
};


// 3. WITHDRAW FUNDS (With 1 Safety Check Added)
export const withdrawFunds = async (req, res) => {
  try {
    const { amount, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // 🔍 Check available balance
    const credits = await Transaction.aggregate([
      { $match: { type: "Credit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const debits = await Transaction.aggregate([
      { $match: { type: "Debit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const currentBalance =
      (credits[0]?.total || 0) - (debits[0]?.total || 0);

    if (amount > currentBalance) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient treasury balance" });
    }

    const withdrawal = await Transaction.create({
      id: `TXN-WD-${Date.now().toString().slice(-6)}`,
      type: "Debit",
      desc: "Admin Withdrawal",
      subDesc: note || "Funds moved to company bank",
      amount,
      status: "Completed",
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: withdrawal });
  } catch (error) {
    res.status(500).json({ success: false, message: "Withdrawal failed" });
  }
};
