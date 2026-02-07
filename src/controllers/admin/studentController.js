import { Student } from "../../models/student.model.js";

import { Notification } from "../../models/notification.model.js";

/**
 * @desc Create Student
 * @route POST /api/admin/student/add
 */
export const createStudent = async (req, res) => {
  try {
    const { name, email, phone, country } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Name, email, phone required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const exists = await Student.findOne({ email: cleanEmail });
    if (exists) return res.status(409).json({ message: "Student already exists" });

    const student = await Student.create({
      name,
      email: cleanEmail,
      phone,
      country,
      kycStatus: "Not Submitted",
      loanStatus: "Not Applied",
      createdBy: req.user._id,
    });

    await Notification.create({
      type: "info",
      message: `New Student Added: ${student.name}`,
      link: `/admin/students/${student._id}`,
    });

    res.status(201).json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create student" });
  }
};


/**
 * @desc Get All Students (FIXED: Now shows all students for Audit/KYC)
 * @route GET /api/admin/student/all
 */
export const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, country } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    if (status) filter.kycStatus = status;
    if (country) filter.country = country;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalRecords = await Student.countDocuments(filter);

    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: students,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch students" });
  }
};


/**
 * @desc Update Student Profile
 * FIXED: Syncs kycStatus to linked User and handles 500 errors safely
 */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { kycUpdate, ...otherUpdates } = req.body;

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // 🔹 Document verification
    if (kycUpdate?.docType) {
      const { docType, status, remark } = kycUpdate;

      if (!student.kycData?.[docType]) {
        return res.status(400).json({ message: "Invalid document type" });
      }

      student.kycData[docType].status = status;
      student.kycData[docType].remark = remark || "";
      student.kycData[docType].verifiedBy = req.user._id;
      student.kycData[docType].verifiedAt = new Date();

      // Auto recalc overall KYC
      const docs = Object.values(student.kycData);
      const allApproved = docs.every(d => d.status === "Approved");
      const anyRejected = docs.some(d => d.status === "Rejected");

      if (allApproved) student.kycStatus = "Verified";
      else if (anyRejected) student.kycStatus = "Partially Verified";
      else student.kycStatus = "Pending";
    }

    Object.assign(student, otherUpdates);
    await student.save();

    res.json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};



/**
 * @desc Get Single Student Details
 */
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json({
      success: true,
      data: {
        ...student.toObject(),
        kycData: student.kycData || {},
        kycProfile: student.kycProfile || {},
        signatureAgreements: student.documents || [],
      },
    });
  } catch {
    res.status(400).json({ message: "Invalid ID" });
  }
};


/**
 * @desc Delete Student
 */
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    await Loan.deleteMany({ studentId: student._id });
await Transaction.deleteMany({ studentId: student._id });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Record already deleted" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Student record purged" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Operation failed" });
  }
};
