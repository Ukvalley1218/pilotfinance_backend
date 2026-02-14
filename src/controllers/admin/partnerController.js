import PDFDocument from "pdfkit";
import User from "../../models/User.js";
import { Parser } from "json2csv";
import { Student } from "../../models/student.model.js";
import Transaction from "../../models/transaction.model.js";
import withdrawalModel from "../../models/withdrawal.model.js";
import CommissionSettings from "../../models/commissionSettings.model.js";

import bcrypt from "bcryptjs";
import { Notification } from "../../models/notification.model.js";

/**
 * @desc Create Partner
 * @route POST /api/partner/partners
 */
export const getGlobalCommission = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const settings = await CommissionSettings.findOne();

    return res.status(200).json({
      success: true,
      data: settings || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Failed to fetch commission" });
  }
};

export const getAllPartnerCommissions = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const partners = await User.find({ role: "Partner" })
      .select("fullName email commission")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: partners,
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch partners" });
  }
};



// --- ADMIN: SET PARTNER COMMISSION ---
export const setGlobalCommission = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const { type, percentage, fixedAmount } = req.body;

    if (!["percentage", "fixed", "both"].includes(type)) {
      return res.status(400).json({ msg: "Invalid commission type" });
    }

    if (percentage < 0 || fixedAmount < 0) {
      return res.status(400).json({ msg: "Invalid values" });
    }

    // Only 1 global config
    let settings = await CommissionSettings.findOne();

    if (!settings) {
      settings = await CommissionSettings.create({
        type,
        percentage: percentage || 0,
        fixedAmount: fixedAmount || 0,
      });
    } else {
      settings.type = type;
      settings.percentage = percentage || 0;
      settings.fixedAmount = fixedAmount || 0;
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: "Global commission updated",
      data: settings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update commission" });
  }
};

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
export const exportPartnersCSV = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const partners = await User.find({ role: "Partner" })
      .select("-password -otpCode -otpExpires -ssnPin")
      .lean();

    if (!partners.length) {
      return res.status(404).json({ msg: "No partners found" });
    }

    // 🔹 Format data properly
    const formattedData = partners.map((p) => ({
      Name: p.fullName,
      Email: p.email,
      Phone: p.phone || "",
      Company: p.companyName || "",
      BusinessType: p.businessType || "",
      Country: p.country || "",
      Status: p.status || "",
      KYCStatus: p.kycStatus || "",
      CommissionType: p.commission?.type || "percentage",
      CommissionPercentage: p.commission?.percentage || 0,
      CommissionFixedAmount: p.commission?.fixedAmount || 0,
      RegisteredAt: p.createdAt,
    }));

    const json2csv = new Parser();
    const csv = json2csv.parse(formattedData);

    res.header("Content-Type", "text/csv");
    res.attachment("partners-report.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export CSV Error:", err);
    res.status(500).json({ msg: "CSV export failed" });
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


export const updateWithdrawalStatus = async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ msg: "Only admin allowed" });
    }

    const withdrawalId = req.params.id;
    const { status, reason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const withdrawal = await withdrawalModel.findById(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({ msg: "Withdrawal not found" });
    }

    if (withdrawal.status !== "Pending") {
      return res.status(400).json({ msg: "Already processed" });
    }

    // ================= APPROVE =================
    if (status === "Approved") {
      const partnerId = withdrawal.partnerId;

      // 🔐 Recalculate wallet balance
      const result = await Transaction.aggregate([
        {
          $match: {
            userId: partnerId,
            status: "Completed",
          },
        },
        {
          $group: {
            _id: null,
            credits: {
              $sum: {
                $cond: [{ $eq: ["$type", "Credit"] }, "$amount", 0],
              },
            },
            debits: {
              $sum: {
                $cond: [{ $eq: ["$type", "Debit"] }, "$amount", 0],
              },
            },
          },
        },
      ]);

      const balance =
        (result[0]?.credits || 0) - (result[0]?.debits || 0);

      if (withdrawal.amountRequested > balance) {
        return res.status(400).json({
          msg: "Insufficient balance",
        });
      }

      const platformFee =
        (withdrawal.amountRequested * 10) / 100;

      withdrawal.status = "Completed";
      withdrawal.platformFee = platformFee;
      withdrawal.amountPayable =
        withdrawal.amountRequested - platformFee;
      withdrawal.processedBy = req.user.id;
      withdrawal.processedAt = new Date();

      await withdrawal.save();

      // Create Debit transaction
      await Transaction.create({
        id: `TXN-WD-${Date.now()}`,
        userId: partnerId,
        type: "Debit",
        desc: "Withdrawal Processed",
        subDesc: `Withdrawal ID: ${withdrawal._id}`,
        amount: withdrawal.amountRequested,
        status: "Completed",
      });

      return res.json({
        success: true,
        message: "Withdrawal approved",
      });
    }

    // ================= REJECT =================
    if (status === "Rejected") {
      withdrawal.status = "Rejected";
      withdrawal.rejectionReason =
        reason || "Rejected by admin";
      withdrawal.processedBy = req.user.id;
      withdrawal.processedAt = new Date();

      await withdrawal.save();

      return res.json({
        success: true,
        message: "Withdrawal rejected",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Update failed" });
  }
};




/**
 * @desc Get All Withdrawal Requests (Admin)
 * @route GET /api/partner/withdrawals
 */
export const getAllWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const totalRecords = await withdrawalModel.countDocuments(filter);

    const withdrawals = await withdrawalModel
      .find(filter)
      .populate("partnerId", "fullName email companyName commissionRate")
      .populate("processedBy", "fullName email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    console.error("Get Withdrawals Error:", err);
    res.status(500).json({ message: "Failed to fetch withdrawals" });
  }
};

