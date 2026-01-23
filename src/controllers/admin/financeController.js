import Transaction from "../../models/transaction.model.js";

// 1. GET LEDGER
export const getLedger = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching ledger" });
  }
};

// 2. GET BALANCE
export const getBalance = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const balance = transactions.reduce((acc, curr) => {
      return curr.type === "Credit" ? acc + curr.amount : acc - curr.amount;
    }, 0);
    res.status(200).json({ success: true, amount: balance });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error calculating balance" });
  }
};

// 3. WITHDRAW FUNDS (With 1 Safety Check Added)
export const withdrawFunds = async (req, res) => {
  try {
    const { amount } = req.body;

    // --- Safety Check Start ---
    const transactions = await Transaction.find();
    const currentBalance = transactions.reduce((acc, curr) => {
      return curr.type === "Credit" ? acc + curr.amount : acc - curr.amount;
    }, 0);

    if (amount > currentBalance) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance!" });
    }
    // --- Safety Check End ---

    const withdrawal = await Transaction.create({
      id: `TXN-${Date.now().toString().slice(-6)}`,
      type: "Debit",
      desc: "Withdrawal to Bank",
      subDesc: "Admin initiated payout",
      amount: amount,
      status: "Completed",
    });
    res.status(201).json({ success: true, data: withdrawal });
  } catch (error) {
    res.status(500).json({ success: false, message: "Withdrawal failed" });
  }
};
