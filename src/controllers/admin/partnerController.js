import { Partner } from "../../models/partner.model.js";
import { Notification } from "../../models/notification.model.js";

/**
 * @desc Create Partner
 * @route POST /api/partner/partners
 */
export const createPartner = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // 1. Backend Validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Missing Required Fields: Name, Email, and Phone are mandatory.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. Check for duplicate email
    const existingPartner = await Partner.findOne({ email: cleanEmail });
    if (existingPartner) {
      return res.status(409).json({
        success: false,
        message: "A partner with this email address already exists.",
      });
    }

    // 3. Save to database
    const partner = await Partner.create({
      ...req.body,
      email: cleanEmail,
    });

    // --- Dynamic Notification Trigger ---
    await Notification.create({
      type: "success",
      message: `New Partner Registered: ${partner.name}`,
      link: `/admin/partners/${partner._id}`,
    });

    return res.status(201).json({
      success: true,
      message: "Partner registered successfully",
      data: partner,
    });
  } catch (error) {
    console.error("Critical Create Partner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error: Failed to save partner record.",
    });
  }
};

/**
 * @desc Update Partner
 * @route PUT /api/partner/partners/:id
 */
export const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner record not found.",
      });
    }

    // Duplicate email check for updates
    if (req.body.email && req.body.email.toLowerCase() !== partner.email) {
      const emailExists = await Partner.findOne({
        email: req.body.email.toLowerCase(),
      });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "The new email is already in use by another partner.",
        });
      }
    }

    const updatedPartner = await Partner.findByIdAndUpdate(
      id,
      {
        $set: {
          ...req.body,
          email: req.body.email?.toLowerCase() || partner.email,
        },
      },
      { new: true, runValidators: true }
    );

    // --- Dynamic Notification Trigger for Updates ---
    await Notification.create({
      type: "info",
      message: `Partner Profile Updated: ${updatedPartner.name}`,
      link: `/admin/partners/${updatedPartner._id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Partner profile updated successfully",
      data: updatedPartner,
    });
  } catch (error) {
    console.error("Update Partner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating partner record.",
    });
  }
};

/**
 * @desc Get All Partners (With Advanced Pagination & Filtering)
 * @route GET /api/partner/partners
 */
export const getAllPartners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      status,
      businessType,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    // Logic to handle frontend "All" filters
    if (status && !["All Status", "All"].includes(status)) {
      filter.status = status;
    }

    if (businessType && !["All Types", "All"].includes(businessType)) {
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
      message: "Failed to load partners from the server.",
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
    return res
      .status(400)
      .json({ success: false, message: "Invalid Partner ID" });
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
    return res
      .status(200)
      .json({ success: true, message: "Partner record deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error deleting record" });
  }
};
