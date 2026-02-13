import PDFDocument from "pdfkit";
import User from "../../models/User.js";

import { Student } from "../../models/student.model.js";
import Transaction from "../../models/transaction.model.js";
import withdrawalModel from "../../models/withdrawal.model.js";

import bcrypt from "bcryptjs";
import { Notification } from "../../models/notification.model.js";

/**
 * @desc Create Partner
 * @route POST /api/partner/partners
 */
export const createPartner = async (req, res) => {
  try {
    const { fullName, email, phone, password, companyName, businessType } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Full name, email and password required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = await User.create({
      fullName,
      email: cleanEmail,
      phone,
      password: hashedPassword,
      role: "Partner",
      companyName,
      businessType,
      isEmailVerified: true,
      isPhoneVerified: true,
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
    const partner = await User.findOneAndUpdate(
      { _id: req.params.id, role: "Partner" },
      req.body,
      { new: true, runValidators: true }
    ).select("-password");

    if (!partner) return res.status(404).json({ message: "Partner not found" });

    res.json({ success: true, data: partner });
  } catch {
    res.status(500).json({ message: "Update failed" });
  }
};



/**
 * @desc Get All Partners (With Advanced Pagination & Filtering)
 * @route GET /api/partner/partners
 */
export const getAllPartners = async (req, res) => {
  try {
    const { search } = req.query;

    const filter = { role: "Partner" };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
      ];
    }

    const partners = await User.find(filter).select("-password").sort({ createdAt: -1 });

    res.json({ success: true, data: partners });
  } catch {
    res.status(500).json({ message: "Failed to fetch partners" });
  }
};



/**
 * @desc Get Partner by ID
 */
export const getPartnerById = async (req, res) => {
  try {
    const partner = await User.findOne({ _id: req.params.id, role: "Partner" }).select("-password");
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    const students = await Student.find({ referredBy: partner._id })
      .select("name email kycStatus loanStatus");

    res.json({ success: true, data: { ...partner.toObject(), students } });
  } catch {
    res.status(400).json({ message: "Invalid ID" });
  }
};


/**
 * @desc Delete Partner
 */
export const deletePartner = async (req, res) => {
  try {
    const partner = await User.findOneAndDelete({ _id: req.params.id, role: "Partner" });
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    // Unlink students but DO NOT delete them
    await Student.updateMany(
      { referredBy: partner._id },
      { $unset: { referredBy: "" } }
    );

    res.json({ success: true, message: "Partner deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};



/**
 * @desc Download Partner Report as PDF
 * @route GET /api/partner/partners/:id/report/pdf
 */
export const downloadPartnerReportPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).lean();
    if (!user) {
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



/**
 * @desc Admin verifies or rejects Partner KYC
 * @route PUT /api/partner/partners/:id/verify-kyc
 */
export const verifyPartnerKYC = async (req, res) => {
  try {
    const { status, reason } = req.body; // status = "Verified" or "Rejected"

    if (!["Verified", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid KYC status" });
    }

    const partner = await User.findOne({
      _id: req.params.id,
      role: "Partner",
    });

    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Update KYC status
    partner.kycStatus = status;

    // Optional: Store rejection reason inside kycData
    if (status === "Rejected") {
      partner.kycData.rejectionReason = reason || "KYC rejected by admin";
    } else {
      partner.kycData.rejectionReason = undefined;
    }

    await partner.save();

    res.json({
      success: true,
      message: `Partner KYC ${status}`,
      data: {
        partnerId: partner._id,
        name: partner.fullName,
        kycStatus: partner.kycStatus,
      },
    });
  } catch (err) {
    console.error("Partner KYC Verify Error:", err);
    res.status(500).json({ message: "KYC verification failed" });
  }
};


export const approveWithdrawal = async (req, res) => {
  try {
    const { withdrawalId } = req.body;
    const adminId = req.user.id;

    const withdrawal = await withdrawalModel.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ msg: "Not found" });

    if (withdrawal.status !== "Pending") {
      return res.status(400).json({ msg: "Already processed" });
    }

    const platformCutPercentage = 10; // 🔥 Your platform fee %
    const platformFee =
      (withdrawal.amountRequested * platformCutPercentage) / 100;

    const amountPayable = withdrawal.amountRequested - platformFee;

    withdrawal.status = "Completed";
    withdrawal.platformFee = platformFee;
    withdrawal.amountPayable = amountPayable;
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();

    await withdrawal.save();

    // 🔹 Create debit transaction from partner wallet
    await Transaction.create({
      id: `TXN-WD-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: withdrawal.partnerId,
      type: "Debit",
      desc: "Withdrawal Processed",
      subDesc: `Withdrawal ID: ${withdrawal._id}`,
      amount: withdrawal.amountRequested,
      status: "Completed",
    });

    res.json({
      success: true,
      message: "Withdrawal approved",
      amountSent: amountPayable,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Approval failed" });
  }
};
