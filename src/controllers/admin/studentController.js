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

    // 1. Basic validation - Handles both 'name' and 'fullName' from frontend
    const displayName = fullName || name;
    if (!displayName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Full Name, email, and phone are required fields",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 2. Prevent duplicate entries
    const existingStudent = await Student.findOne({ email: cleanEmail });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this email is already registered",
      });
    }

    // 3. SMART LINK: Check if this student already has a User account
    const associatedUser = await User.findOne({ email: cleanEmail });

    // 4. Create record using the Master Model standard 'fullName'
    const student = await Student.create({
      ...req.body,
      name: displayName,
      fullName: displayName, // Unified field
      email: cleanEmail,
      userId: associatedUser ? associatedUser._id : null,
      createdBy: req.user?._id,
    });

    // --- Dynamic Notification Trigger ---
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
 * @desc Get All Students (Handles Dashboard 400 Error)
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

    // Filter Logic: Matches frontend dashboard dropdowns
    if (status && status !== "All Status") filter.status = status;
    if (loan && loan !== "All Types") filter.loan = loan;
    if (country && country !== "All Countries") filter.country = country;

    // Search Logic: Supports both old 'name' and new 'fullName' fields
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { appId: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "asc" ? 1 : -1 };

    // Population logic includes the standard User fields
    const students = await Student.find(filter)
      .populate("userId", "avatar isPhoneVerified kycStatus")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Student.countDocuments(filter);

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
      message: "Failed to fetch students. Database connection error.",
    });
  }
};

/**
 * @desc Update Student Profile
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

    // If 'name' is being updated, update 'fullName' too for consistency
    if (req.body.name) req.body.fullName = req.body.name;

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    await Notification.create({
      type: "success",
      message: `Profile Updated: ${
        updatedStudent.fullName || updatedStudent.name
      }`,
      link: `/admin/students/${updatedStudent._id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Record updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error during update" });
  }
};

/**
 * @desc Get Single Student Details
 */
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("userId");

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    return res.status(200).json({ success: true, data: student });
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
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Record already deleted" });

    return res
      .status(200)
      .json({ success: true, message: "Student record purged" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Operation failed" });
  }
};
