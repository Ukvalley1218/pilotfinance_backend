import { Loan } from "../models/loan.model.js";

/**
 * Create Loan
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
      error: error.message,
    });
  }
};

/**
 * Update Loan
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

    // Prevent duplicate loanId update
    if (req.body.loanId && req.body.loanId !== loan.loanId) {
      const exists = await Loan.findOne({ loanId: req.body.loanId });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "Loan ID already exists",
        });
      }
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
      error: error.message,
    });
  }
};

/**
 * Get All Loans (Pagination + Search + Filters)
 * @route GET /api/loans
 * @access Public / Protected (as per your auth)
 */
export const getAllLoans = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      approvedBy,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // Base filter
    const filter = {};

    // Specific filters
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (approvedBy) filter.approvedBy = approvedBy;

    // Global search across multiple fields
    if (search) {
      filter.$or = [
        { loanId: { $regex: search, $options: "i" } },
        { approvedBy: { $regex: search, $options: "i" } },
        { borrowerName: { $regex: search, $options: "i" } },
        { borrowerEmail: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // Query execution
    const loans = await Loan.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    const totalRecords = await Loan.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalRecords / pageSize),
        pageSize,
      },
      data: loans,
    });
  } catch (error) {
    console.error("Get Loans Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get Loan by ID
 */
export const getLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.findById(id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    console.error("Get Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Invalid loan ID",
      error: error.message,
    });
  }
};

/**
 * Delete Loan
 */
export const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    await Loan.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Loan deleted successfully",
    });
  } catch (error) {
    console.error("Delete Loan Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
