import { Partner } from "../models/partner.model.js"; // Import matching named export

/**
 * @desc Create Partner
 * @route POST /api/partner
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

    // Check existing partner on dbOne
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
    });
  }
};

/**
 * @desc Update Partner
 * @route PUT /api/partner/:id
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
    });
  }
};

/**
 * @desc Get All Partners (With Filter & Search for Frontend Directory)
 * @route GET /api/partner
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    // Logic to ignore "All" options from frontend
    if (status && status !== "All Status" && status !== "All") {
      filter.status = status;
    }

    if (
      businessType &&
      businessType !== "All Types" &&
      businessType !== "All"
    ) {
      filter.businessType = businessType;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "asc" ? 1 : -1 };

    const partners = await Partner.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Partner.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
      },
      data: partners,
    });
  } catch (error) {
    console.error("Get Partners Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @desc Get Partner by ID
 */
export const getPartnerById = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    return res.status(200).json({ success: true, data: partner });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Invalid ID" });
  }
};

/**
 * @desc Delete Partner
 */
export const deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    return res.status(200).json({ success: true, message: "Partner deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting" });
  }
};
