import { Partner } from "../models/partner.model.js";

/**
 * Create Partner
 */
export const createPartner = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required",
      });
    }

    const existingPartner = await Partner.findOne({ email });
    if (existingPartner) {
      return res.status(409).json({
        success: false,
        message: "Partner with this email already exists",
      });
    }

    const partner = await Partner.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Partner created successfully",
      data: partner,
    });
  } catch (error) {
    console.error("Create Partner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Update Partner
 */
export const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    // Email duplicate check
    if (req.body.email && req.body.email !== partner.email) {
      const emailExists = await Partner.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Partner updated successfully",
      data: updatedPartner,
    });
  } catch (error) {
    console.error("Update Partner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get All Partners (Pagination + Search + Filters)
 * @route GET /api/partners
 */
export const getAllPartners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      businessType,
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
    if (businessType) filter.businessType = businessType;

    // Global search (search in any important field)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
        { businessType: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // Query
    const partners = await Partner.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    const totalRecords = await Partner.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalRecords / pageSize),
        pageSize,
      },
      data: partners,
    });
  } catch (error) {
    console.error("Get Partners Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get Partner by ID
 */
export const getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Get Partner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Invalid partner ID",
      error: error.message,
    });
  }
};

/**
 * Delete Partner
 */
export const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    await Partner.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Partner deleted successfully",
    });
  } catch (error) {
    console.error("Delete Partner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
