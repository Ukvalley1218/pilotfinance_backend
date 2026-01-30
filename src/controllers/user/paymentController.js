import Loan from "../../models/loan.js";
import Transaction from "../../models/transaction.model.js";

/**
 * @desc    Process a loan repayment (EMI)
 * @route   POST /api/payments/pay
 */
export const processPayment = async (req, res) => {
  try {
    const { loanId, amount } = req.body;
    const userId = req.user.id;

    // 1. Find the specific loan
    const loan = await Loan.findOne({ _id: loanId, userId });

    if (!loan) {
      return res
        .status(404)
        .json({ success: false, msg: "Loan record not found" });
    }

    if (loan.status === "Completed") {
      return res
        .status(400)
        .json({ success: false, msg: "This loan is already fully repaid." });
    }

    const paymentAmount = Number(amount);

    // 2. Update Loan Financials
    loan.paidAmount += paymentAmount;

    // 3. Logic: Check for loan completion
    // We allow a small margin (0.5) for floating point math
    if (loan.paidAmount >= loan.totalWithInterest - 0.5) {
      loan.status = "Completed";
      loan.paidAmount = loan.totalWithInterest;
    }

    // 4. Create Transaction using your specific Schema (TXN ID logic)
    const transaction = await Transaction.create({
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`, // Generates TXN-123456
      userId: userId,
      type: "Debit", // Money paid out by student
      desc: `EMI Payment - ${loan.category}`,
      subDesc: `Loan Ref: ${loan.loanId}`,
      amount: paymentAmount,
      status: "Completed",
    });

    await loan.save();

    res.status(200).json({
      success: true,
      message: "Payment successful!",
      data: {
        paidAmount: loan.paidAmount,
        remaining: loan.totalWithInterest - loan.paidAmount,
        progress: loan.progress,
        status: loan.status,
        transaction,
      },
    });
  } catch (err) {
    console.error("🔥 PAYMENT_ERROR:", err);
    res.status(500).json({
      success: false,
      msg: "Internal Server Error during payment processing.",
    });
  }
};
