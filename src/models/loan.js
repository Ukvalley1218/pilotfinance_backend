import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    // The link to the user/student who applied
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    // The link to the partner who submitted the application
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // --- SHARED IDENTIFIERS ---
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
      default: "Education", // Professional default for recruitment project
    },

    // --- FINANCIAL DATA ---
    totalAmount: {
      type: Number,
      required: [true, "Total loan amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    approvedAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    monthlyPayment: {
      type: Number,
      default: 0,
    },
    interestRate: {
      type: Number,
      default: 0,
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

    // --- STATUS & ADMIN TRACKING ---
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
    approvedBy: {
      type: String,
      default: "",
    },
    approvedBySub: {
      type: String,
      default: "",
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true, // CRITICAL: Makes Dashboard "Recent" sorting work
  },
);

// --- VIRTUALS FOR ADMIN DASHBOARD CORRELATION ---

// 1. Progress Calculation for User Panel
loanSchema.virtual("progress").get(function () {
  if (!this.totalAmount || this.totalAmount === 0) return 0;
  const percentage = (this.paidAmount / this.totalAmount) * 100;
  return Math.min(Math.round(percentage), 100);
});

// 2. Mapping 'totalAmount' to 'requestedAmount' for Dashboard UI
loanSchema.virtual("requestedAmount").get(function () {
  return this.totalAmount;
});

// 3. Mapping 'userId.fullName' to 'borrowerName' for Dashboard UI
// Note: Requires .populate('userId') in your Admin Controller
loanSchema.virtual("borrowerName").get(function () {
  return this.userId ? this.userId.fullName : "Unknown Student";
});

const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
