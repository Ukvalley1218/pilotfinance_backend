import PDFDocument from "pdfkit";
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


/**
 * @desc Download Partner Report as PDF
 * @route GET /api/partner/partners/:id/report/pdf
 */
export const downloadPartnerReportPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await Partner.findById(id).lean();
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found for report generation.",
      });
    }

    // 🧾 Create PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=partner-report-${partner.name}.pdf`
    );

    doc.pipe(res);

    // 🎨 Header
    doc
      .fontSize(20)
      .text("Partner Detailed Report", { align: "center" })
      .moveDown(1.5);

    // Helper for section titles
    const sectionTitle = (title) => {
      doc.moveDown().fontSize(14).text(title, { underline: true });
      doc.moveDown(0.5);
    };

    const field = (label, value) => {
      doc.fontSize(11).text(`${label}: ${value || "N/A"}`);
    };

    // 👤 Personal Info
    sectionTitle("Personal Information");
    field("Name", partner.name);
    field("Email", partner.email);
    field("Phone", partner.phone);
    field("Gender", partner.gender);
    field("Date of Birth", partner.dob);
    field("Country", partner.country);
    field("Address", partner.address);

    // 🏢 Business Info
    sectionTitle("Business Information");
    field("Business Name", partner.businessName);
    field("Business Type", partner.businessType);
    field("Registration Number", partner.regNumber);
    field("GST ID", partner.gstId);
    field("Website", partner.website);
    field("Experience", partner.experience);

    // 🪪 Identity Info
    sectionTitle("Identity Information");
    field("ID Proof Type", partner.idProofType);
    field("ID Proof Number", partner.idProofNumber);

    // 💳 Subscription Info
    sectionTitle("Subscription Details");
    field("Plan Type", partner.planType);
    field("Fee Amount", `₹ ${partner.feeAmount}`);
    field("Status", partner.status);

    // 🕒 Timestamps
    sectionTitle("System Information");
    field("Registered On", new Date(partner.createdAt).toLocaleString());
    field("Last Updated", new Date(partner.updatedAt).toLocaleString());

    // Footer
    doc
      .moveDown(2)
      .fontSize(10)
      .text("This is a system generated report.", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Partner PDF Report Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while generating partner PDF report.",
    });
  }
};
