import Loan from "../../models/loan.js"; // Pointing to the unified model

/**
 * @desc Create Loan (Triggered from Partner/User Panel)
 * @route POST /api/loan
 */
export const createLoan = async (req, res) => {
  try {
    const { userId, totalAmount, requestedAmount } = req.body;

    // Bridge the gap between naming conventions
    const finalAmount = totalAmount || requestedAmount;

    if (!userId || !finalAmount) {
      return res.status(400).json({
        success: false,
        message: "User ID and loan amount are required",
      });
    }

    // Creating loan using the unified model
    // We explicitly map finalAmount to totalAmount to ensure DB consistency
    const loan = await Loan.create({
      ...req.body,
      totalAmount: finalAmount,
    });

    return res.status(201).json({
      success: true,
      message: "Loan application submitted successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Create Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during application",
    });
  }
};

/**
 * @desc Update Loan (Used by Admin for Approvals/Verification)
 * @route PUT /api/loan/:id
 */
export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan record not found",
      });
    }

    // Logic: Automatically set disbursement date when status is changed to Disbursed
    if (req.body.status === "Disbursed" && !req.body.disbursementDate) {
      req.body.disbursementDate = new Date();
    }

    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).populate("userId", "fullName email");

    return res.status(200).json({
      success: true,
      message: "Loan status updated successfully",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Update Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update loan status",
    });
  }
};

/**
 * @desc Get All Loans (Dynamic sync for Admin Dashboard)
 * @route GET /api/loan/loans
 */
export const getAllLoans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status && status !== "All Status") filter.status = status;

    if (search) {
      filter.$or = [
        { loanId: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "desc" ? -1 : 1 };

    /**
     * DYNAMIC SYNC LOGIC:
     * 1. .populate("userId") ensures we get the Student Name for the Admin Dashboard.
     * 2. Sorting by createdAt DESC ensures new requests from Partners appear at the top.
     */
    const loans = await Loan.find(filter)
      .populate("userId", "fullName email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Loan.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
      },
      data: loans,
    });
  } catch (error) {
    console.error("Get Loans Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching applications",
    });
  }
};

/**
 * @desc Get Single Loan by ID
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("userId", "fullName email phone address")
      .populate("partnerId", "companyName fullName email");

    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }
    return res.status(200).json({ success: true, data: loan });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Invalid Loan ID" });
  }
};

/**
 * @desc Delete Loan
 */
export const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Loan record deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error deleting record" });
  }
};
