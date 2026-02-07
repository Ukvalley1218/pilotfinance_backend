import PDFDocument from "pdfkit";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import { Notification } from "../../models/notification.model.js";

/**
 * @desc Create Partner
 * @route POST /api/partner/partners
 */
export const createPartner = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Name, email, phone, password required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await Partner.findOne({ email: cleanEmail });
    if (existing) return res.status(409).json({ message: "Partner already exists" });

    // 1️⃣ Create Login Account
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: name,
      email: cleanEmail,
      phone,
      password: hashedPassword,
      role: "Partner",
      isEmailVerified: true,
    });

    // 2️⃣ Create Partner Business Profile
    const partner = await Partner.create({
      ...req.body,
      email: cleanEmail,
      userId: user._id, // link login account
    });

    await Notification.create({
      type: "success",
      message: `New Partner Registered: ${partner.name}`,
      link: `/admin/partners/${partner._id}`,
    });

    res.status(201).json({ success: true, data: partner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create partner" });
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

    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const updated = await Partner.findByIdAndUpdate(id, req.body, { new: true });

    // 🔄 Sync login account
    if (partner.userId) {
      await User.findByIdAndUpdate(partner.userId, {
        fullName: updated.name,
        email: updated.email,
        phone: updated.phone,
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
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
