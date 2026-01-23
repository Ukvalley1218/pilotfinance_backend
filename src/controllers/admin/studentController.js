import { Student } from "../../models/student.model.js";
import User from "../../models/User.js";
import { Notification } from "../../models/notification.model.js";

/**
 * @desc Create Student
 * @route POST /api/admin/student/add
 */
export const createStudent = async (req, res) => {
  try {
    const { name, fullName, email, phone } = req.body;

    const displayName = fullName || name;
    if (!displayName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Full Name, email, and phone are required fields",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingStudent = await Student.findOne({ email: cleanEmail });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this email is already registered",
      });
    }

    const associatedUser = await User.findOne({ email: cleanEmail });

    const student = await Student.create({
      ...req.body,
      name: displayName,
      fullName: displayName,
      email: cleanEmail,
      userId: associatedUser ? associatedUser._id : null,
      createdBy: req.user?._id,
    });

    await Notification.create({
      type: "info",
      message: `New Student Added: ${displayName}`,
      link: `/admin/students/${student._id}`,
    });

    return res.status(201).json({
      success: true,
      message: associatedUser
        ? "Student record saved and linked to User account"
        : "Student record saved successfully",
      data: student,
    });
  } catch (error) {
    console.error("Create Student Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error: Failed to save record",
    });
  }
};

/**
 * @desc Get All Students (FIXED: Now shows all students for Audit/KYC)
 * @route GET /api/admin/student/all
 */
export const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      loan,
      country,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status && status !== "All Status") filter.status = status;
    if (loan && loan !== "All Types") filter.loan = loan;
    if (country && country !== "All Countries") filter.country = country;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { appId: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "asc" ? 1 : -1 };

    const totalRecords = await Student.countDocuments(filter);

    const students = await Student.find(filter)
      .populate("userId", "avatar isPhoneVerified kycStatus")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: students,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get Students Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
};

/**
 * @desc Update Student Profile
 * FIXED: Syncs kycStatus to linked User and handles 500 errors safely
 */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    if (req.body.name) req.body.fullName = req.body.name;

    // 1. Update Student record
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    // 2. CRITICAL SYNC: Update linked User's kycStatus if it's being changed
    if (updatedStudent.userId && req.body.kycStatus) {
      await User.findByIdAndUpdate(updatedStudent.userId, {
        kycStatus: req.body.kycStatus,
      });
    }

    // 3. Create Notification
    await Notification.create({
      type: req.body.kycStatus === "Verified" ? "success" : "info",
      message: `Profile ${req.body.kycStatus || "Updated"}: ${updatedStudent.fullName || updatedStudent.name}`,
      link: `/admin/students/${updatedStudent._id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Record updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Update Student Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during update",
      error: error.message,
    });
  }
};

/**
 * @desc Get Single Student Details
 */
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("userId");

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const studentObj = student.toObject();

    const responseData = {
      ...studentObj,
      kycFiles: {
        idFront: student.kycData?.idFront || null,
        idBack: student.kycData?.idBack || null,
        selfie: student.kycData?.selfie || null,
        addressProof: student.kycData?.addressProofFile || null,
        loa: student.kycData?.loa || null,
        passbook: student.kycData?.passbook || null,
      },
      signatureAgreements: (student.documents || []).filter(
        (doc) => doc.status === "Uploaded" || doc.status === "Signed",
      ),
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid student reference ID" });
  }
};

/**
 * @desc Delete Student
 */
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
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
