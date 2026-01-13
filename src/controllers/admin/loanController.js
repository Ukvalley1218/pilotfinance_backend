import Loan from "../../models/loan.js"; // Unified Master Model

/**
 * @desc Create Loan
 * @route POST /api/loan
 */
export const createLoan = async (req, res) => {
  try {
    const { loanId, requestedAmount } = req.body;

    if (!loanId || !requestedAmount) {
      return res.status(400).json({
        success: false,
        message: "Loan ID and requested amount are required",
      });
    }

    const existingLoan = await Loan.findOne({ loanId });
    if (existingLoan) {
      return res.status(409).json({
        success: false,
        message: "Loan with this ID already exists",
      });
    }

    // Creating loan using the unified connection
    const loan = await Loan.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Create Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @desc Update Loan (Used for Approvals/Verification)
 * @route PUT /api/loan/:id
 */
export const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    // Logic to sync status changes with disbursement dates
    if (req.body.status === "Disbursed" && !req.body.disbursementDate) {
      req.body.disbursementDate = new Date();
    }

    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Loan updated successfully",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Update Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @desc Get All Loans (Used for Reports & Analytics)
 * @route GET /api/loan
 */
export const getAllLoans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status && status !== "All Status") filter.status = status;
    if (type && type !== "All Types") filter.type = type;

    if (search) {
      filter.$or = [
        { loanId: { $regex: search, $options: "i" } },
        { approvedBy: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "asc" ? 1 : -1 };

    // Added .populate() so Admin can see which User (Student) belongs to the loan
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
      message: "Internal server error",
    });
  }
};

/**
 * @desc Get Loan by ID
 */
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate(
      "userId",
      "fullName email"
    );
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }
    return res.status(200).json({ success: true, data: loan });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Invalid ID" });
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
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting" });
  }
};
