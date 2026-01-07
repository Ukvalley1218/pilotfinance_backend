import { Student } from "../models/student.model.js";
import { Notification } from "../models/notification.model.js"; // Import matching named export

/**
 * @desc Create Student
 * @route POST /api/student AND POST /api/student/add_student
 */
export const createStudent = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // 1. Basic validation - Prevents empty records in database_one
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required fields",
      });
    }

    // 2. Check duplicate email in the new database instance
    const existingStudent = await Student.findOne({
      email: email.toLowerCase(),
    });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A student with this email is already registered",
      });
    }

    // 3. Create record (The model handles the dbOne connection automatically)
    const student = await Student.create({
      ...req.body,
      email: email.toLowerCase(),
      createdBy: req.user._id, // Tracking which admin created the record
    });

    // --- NEW: Dynamic Notification Trigger ---
    await Notification.create({
      type: "info",
      message: `New Student Registration: ${student.name}`,
      link: `/admin/students/${student._id}`,
    });

    return res.status(201).json({
      success: true,
      message: "Student record saved successfully",
      data: student,
    });
  } catch (error) {
    console.error("Critical Create Student Error:", error);
    return res.status(500).json({
      success: false,
      message: "Backend failed to save student. Check server logs.",
    });
  }
};

/**
 * @desc Get All Students (Pagination + Advanced Filters)
 * @route GET /api/student AND GET /api/student/students
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

    // Filter Logic: Matches frontend dropdowns
    if (status && status !== "All Status") filter.status = status;
    if (loan && loan !== "All Types") filter.loan = loan;
    if (country && country !== "All Countries") filter.country = country;

    // Search Logic: Matches the Search Bar in the Header
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { appId: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = { [sortBy]: order === "asc" ? 1 : -1 };

    const students = await Student.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Student.countDocuments(filter);

    // This data structure is exactly what your React .map() functions expect
    return res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
      },
      data: students,
    });
  } catch (error) {
    console.error("Get Students Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sync student list with dashboard",
    });
  }
};

/**
 * @desc Update Student
 * @route PUT /api/student/:id
 */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if record exists before attempting update
    const student = await Student.findById(id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // --- NEW: Dynamic Notification Trigger for Update ---
    await Notification.create({
      type: "success",
      message: `Profile Updated: ${updatedStudent.name}`,
      link: `/admin/students/${updatedStudent._id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: updatedStudent,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Update failed" });
  }
};

/**
 * @desc Get Single Student
 */
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({ success: true, data: student });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format" });
  }
};

/**
 * @desc Delete Student
 */
export const deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Record removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Deletion failed" });
  }
};
