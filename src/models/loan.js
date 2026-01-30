import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    // --- RELATIONSHIPS ---
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    // NEW: Link to the specific Student Application record
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false, // Set to true if every loan MUST have a student record
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // --- IDENTIFIERS ---
    loanId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => `LN${Math.floor(100000 + Math.random() * 900000)}`,
    },
    title: {
      type: String,
      trim: true,
      default: "New Loan Application",
    },
    category: {
      type: String,
      enum: [
        "Education",
        "Primary",
        "Business",
        "Recruit by Choice",
        "Car",
        "Home",
        "Personal",
        "Other",
      ],
      default: "Education",
    },

    // --- FINANCIAL DATA ---
    principalRequested: {
      type: Number,
      required: [true, "Original requested amount is required"],
      min: [0, "Amount cannot be negative"],
      default: 0,
    }, // PERMANENT: The original borrowed amount

    totalAmount: {
      type: Number, // LIVE: Remaining Debt Balance
      required: [true, "Total loan amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    totalWithInterest: {
      type: Number, // PERMANENT: Principal + Interest (Total to be paid)
      default: 0,
    },
    paidAmount: {
      type: Number, // LIVE: Total payments made so far
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    monthlyPayment: {
      type: Number, // The EMI
      default: 0,
    },
    interestRate: {
      type: Number, // percentage (e.g., 2.5)
      default: 2.5,
    },

    // --- TIMELINES ---
    period: {
      type: String, // e.g., "12 Months"
      required: [true, "Loan period is required"],
    },
    payoffDate: {
      type: Date,
      required: [true, "Payoff date is required"],
    },
    disbursementDate: {
      type: Date,
    },

    // --- PAYMENT DETAILS ---
    cardUsed: {
      type: String,
      default: "Mastercard",
    },
    lastFourDigits: {
      type: String,
      default: "0000",
    },

    // --- STATUS ---
    status: {
      type: String,
      enum: [
        "Pending",
        "Reviewing",
        "Approved",
        "Active",
        "Rejected",
        "Disbursed",
        "Closed",
        "Completed",
      ],
      default: "Pending",
    },
    approvedBy: { type: String, default: "" },
    approvedBySub: { type: String, default: "" },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

// --- VIRTUALS FOR UI SYNC ---

// 1. Progress: (Paid / Total Debt) * 100
loanSchema.virtual("progress").get(function () {
  if (!this.totalWithInterest || this.totalWithInterest === 0) return 0;
  const percentage = (this.paidAmount / this.totalWithInterest) * 100;
  return Math.min(Math.round(percentage), 100);
});

// 2. Remaining Balance: (Total Debt - Paid)
loanSchema.virtual("remainingBalance").get(function () {
  const balance = (this.totalWithInterest || 0) - (this.paidAmount || 0);
  return Math.max(0, balance);
});

// 3. Requested Amount
loanSchema.virtual("requestedAmount").get(function () {
  return this.principalRequested;
});

// 4. Interest Amount
loanSchema.virtual("totalInterestAmount").get(function () {
  return (this.totalWithInterest || 0) - (this.principalRequested || 0);
});

loanSchema.virtual("borrowerName").get(function () {
  return this.userId ? this.userId.fullName : "Unknown Student";
});

loanSchema.virtual("nextPaymentDate").get(function () {
  if (!this.disbursementDate) return null;
  const date = new Date(this.disbursementDate);
  date.setMonth(date.getMonth() + 1);
  return date;
});

const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
