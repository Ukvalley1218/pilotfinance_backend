import { Student } from "../../models/student.model.js";
import Loan from "../../models/loan.js";
import mongoose from "mongoose";
import Transaction from "../../models/transaction.model.js";
import User from "../../models/User.js";
import CommissionSettings from "../../models/commissionSettings.model.js";

/**
 * @desc Create Loan (Triggered from Partner/User Panel)
 * Updated to handle Monthly EMI math for consistency.
 */
export const createLoan = async (req, res) => {
  try {
    const { studentId, category, principalRequested, period, interestRate } =
      req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const n = parseInt(period) || 12;
    const r = (interestRate || 2.5) / 100;

    const emi = Math.round(
      (principalRequested * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1),
    );

    const totalWithInterest = emi * n;

    const loan = await Loan.create({
      studentId,
      partnerId: student.referredBy || null,
      category,
      principalRequested,
      totalWithInterest,
      totalAmount: totalWithInterest,
      monthlyPayment: emi,
      interestRate,
      period: `${n} Months`,
      status: "Approved",
    });

    student.loanStatus = "Approved";
    await student.save();

    res.status(201).json({ success: true, data: loan });
  } catch (err) {
    res.status(500).json({ message: "Loan creation failed" });
  }
};

/**
 * @desc Update Loan (Used by Admin for Approvals/Verification)
 */
// export const updateLoan = async (req, res) => {
//   try {
//     const loan = await Loan.findById(req.params.id).populate("studentId");
//     if (!loan) return res.status(404).json({ message: "Loan not found" });

//     const { status } = req.body;

//     // ------------------ APPROVED ------------------
//     if (status === "Approved" && loan.status !== "Approved") {
//       loan.status = "Approved";

//       const student = await Student.findById(loan.studentId);

//       // Update student loan lifecycle
//       await Student.findByIdAndUpdate(loan.studentId, {
//         loanStatus: "Approved",
//       });

//       // ------------------ PARTNER COMMISSION ------------------
//       if (student?.referredBy) {
//         const partner = await User.findById(student.referredBy);

//         if (partner && partner.commissionRate > 0) {
//           const commissionAmount =
//             (loan.principalRequested * partner.commissionRate) / 100;

//           await Transaction.create({
//             id: `TXN-COMM-${Math.floor(100000 + Math.random() * 900000)}`,
//             userId: partner._id, // Wallet owner = Partner
//             studentId: student._id,
//             type: "Credit",
//             desc: `Commission for ${loan.category} Loan`,
//             subDesc: `Loan Ref: ${loan.loanId}`,
//             amount: commissionAmount,
//             status: "Completed",
//           });

//           console.log(
//             `💰 Commission ${commissionAmount} credited to partner ${partner.fullName}`,
//           );
//         }else{
//           console.log(`No commission for partner ${partner?.fullName || "Unknown"}`);
//         }
//       }
//     }

//     // ------------------ DISBURSED ------------------
//     if (status === "Disbursed" && loan.status !== "Disbursed") {
//       loan.status = "Disbursed";
//       loan.disbursementDate = new Date();

//       const student = loan.studentId;
//       const amount = loan.principalRequested;

//       // 🔥 UPDATE STUDENT LOAN FLAGS
//       await Student.findByIdAndUpdate(student._id, {
//         loanStatus: "Active",
//         loan: "Yes", // <-- THIS IS THE NEW LINE
//         requestedAmount: amount, // optional but useful for UI
//       });

//       // ✅ CREATE TRANSACTION (LOAN CREDIT)
//       await Transaction.create({
//         id: `TXN-FUND-${Math.floor(100000 + Math.random() * 900000)}`,
//         userId: student.userId || student._id, // depends on your schema
//         studentId: student._id,
//         type: "Credit",
//         desc: `${loan.category} Loan Disbursed`,
//         subDesc: `Loan Ref: ${loan._id}`,
//         amount: amount,
//         status: "Completed",
//       });
//     }

//     // ------------------ REJECTED ------------------
//     if (status === "Rejected" && loan.status !== "Rejected") {
//       loan.status = "Rejected";
//       await Student.findByIdAndUpdate(loan.studentId._id, {
//         loanStatus: "Rejected",
//       });
//     }

//     Object.assign(loan, req.body);
//     await loan.save();

//     res.json({ success: true, data: loan });
//   } catch (err) {
//     console.error("Loan Update Error:", err);
//     res.status(500).json({ message: "Update failed" });
//   }
// };

export const updateLoan = async (req, res) => {
  try {
    console.log("==================================================");
    console.log("📌 Loan Update API Called");
    console.log("Loan ID:", req.params.id);
    console.log("Incoming Body:", req.body);

    const loan = await Loan.findById(req.params.id).populate("studentId");

    if (!loan) {
      console.log("❌ Loan not found");
      return res.status(404).json({ message: "Loan not found" });
    }

    console.log("🔎 Existing Loan Status:", loan.status);

    const { status } = req.body;

    // ================== APPROVED ==================
 // ================== APPROVED ==================
if (status === "Approved" && loan.status !== "Approved") {
  console.log("➡️ Changing status to APPROVED");

  loan.status = "Approved";

  const student = await Student.findById(loan.studentId);
  await Student.findByIdAndUpdate(loan.studentId, {
    loanStatus: "Approved",
  });

  console.log("✅ Student loanStatus updated to Approved");

  // ---------- PARTNER COMMISSION ----------
  if (student?.referredBy && !loan.commissionPaid) {
    const partner = await User.findById(student.referredBy);

    if (partner && partner.commission) {
      const commissionConfig = await Settings.findOne();

if (student?.referredBy && commissionConfig) {
  const partner = await User.findById(student.referredBy);

  let commissionAmount = 0;
  const P = loan.principalRequested;

  if (commissionConfig.type === "percentage") {
    commissionAmount = (P * commissionConfig.percentage) / 100;
  }

  if (commissionConfig.type === "fixed") {
    commissionAmount = commissionConfig.fixedAmount;
  }

  console.log(`💰 Calculated Commission for partner ${partner.fullName}: ${commissionAmount}`);

  if (commissionAmount > 0) {
    await Transaction.create({
      id: `TXN-COMM-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: partner._id,
      studentId: student._id,
      type: "Credit",
      desc: `Commission for ${loan.category} Loan`,
      subDesc: `Loan Ref: ${loan.loanId}`,
      amount: commissionAmount,
      status: "Completed",
    });
  }
}
}
  }
}


    // ================== DISBURSED ==================
    if (status === "Disbursed" && loan.status !== "Disbursed") {
      console.log("➡️ Changing status to DISBURSED");

      loan.status = "Disbursed";
      loan.disbursementDate = new Date();
      loan.remainingAmount = loan.totalAmount;

      const student = loan.studentId;
      const amount = loan.principalRequested;

      console.log("👤 Student ID:", student?._id);
      console.log("💵 Disbursement Amount:", amount);

      await Student.findByIdAndUpdate(student._id, {
        loanStatus: "Active",
        loan: "Yes",
        requestedAmount: amount,
      });

      console.log("✅ Student flags updated (Active, Loan Yes)");

      const txn = await Transaction.create({
        id: `TXN-FUND-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: student.userId || student._id,
        studentId: student._id,
        type: "Credit",
        desc: `${loan.category} Loan Disbursed`,
        subDesc: `Loan Ref: ${loan._id}`,
        amount: amount,
        status: "Completed",
      });

      console.log("✅ Loan Disbursement Transaction Created:", txn._id);

      // Generate EMI Schedule for auto-debit
      try {
        const emiSchedule = await generateEMISchedule(loan);
        console.log(`✅ EMI Schedule Generated: ${emiSchedule.length} installments`);
      } catch (emiError) {
        console.error("⚠️ Failed to generate EMI schedule:", emiError.message);
        // Continue without failing the disbursement
      }
    }

    // ================== REJECTED ==================
    if (status === "Rejected" && loan.status !== "Rejected") {
      console.log("➡️ Changing status to REJECTED");

      loan.status = "Rejected";

      await Student.findByIdAndUpdate(loan.studentId._id, {
        loanStatus: "Rejected",
      });

      console.log("✅ Student loanStatus updated to Rejected");
    }

    console.log("📝 Final Loan Object Before Save:", loan);

    Object.assign(loan, req.body);
    await loan.save();

    console.log("🎉 Loan Updated Successfully");
    console.log("==================================================");

    res.json({ success: true, data: loan });
  } catch (err) {
    console.error("🚨 Loan Update Error:", err);
    console.error("Stack:", err.stack);

    res.status(500).json({
      message: "Update failed",
      error: err.message,
    });
  }
};

/**
 * @desc Get All Loans (Dynamic sync for Admin Dashboard)
 */
export const getAllLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const loans = await Loan.find(filter)
      .populate("studentId", "name email phone kycStatus")
      .populate("partnerId", "fullName companyName email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: loans });
  } catch {
    res.status(500).json({ message: "Failed to fetch loans" });
  }
};

/**
 * @desc Get Single Loan by ID
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("studentId")
      .populate("partnerId", "fullName companyName email");

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    res.json({ success: true, data: loan });
  } catch {
    res.status(400).json({ message: "Invalid loan ID" });
  }
};

/**
 * @desc Delete Loan
 */
export const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    await Student.findByIdAndUpdate(loan.studentId, {
      loanStatus: "Not Applied",
    });

    res.json({ success: true, message: "Loan deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};
