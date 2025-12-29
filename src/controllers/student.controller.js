import { Student } from "../models/student.model.js";

/**
 * Create Student
 */
export const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      agency,
      uni,
      course,
      country,
      intake,
      duration,
      appId,
      loanId,
      loanType,
      requestedAmount,
      status,
      loan,
    } = req.body;

    // Basic validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required",
      });
    }

    // Check duplicate email
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Student with this email already exists",
      });
    }

    const student = await Student.create({
      name,
      email,
      phone,
      agency,
      uni,
      course,
      country,
      intake,
      duration,
      appId,
      loanId,
      loanType,
      requestedAmount,
      status,
      loan,
    });

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    console.error("Create Student Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Update Student by ID
 */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      agency,
      uni,
      course,
      country,
      intake,
      duration,
      appId,
      loanId,
      loanType,
      requestedAmount,
      status,
      loan,
    } = req.body;

    // Check student exists
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // If email is being updated, check duplicate
    if (email && email !== student.email) {
      const emailExists = await Student.findOne({ email });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another student",
        });
      }
    }

    // Update only provided fields
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        $set: {
          name,
          email,
          phone,
          agency,
          uni,
          course,
          country,
          intake,
          duration,
          appId,
          loanId,
          loanType,
          requestedAmount,
          status,
          loan,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Update Student Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get All Students (with optional filters)
 */
export const getAllStudents = async (req, res) => {
  try {
    const { status, loan, search } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (loan) filter.loan = loan;

    // Search by name / email / phone
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("Get Students Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get Student by ID
 */
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get Student Error:", error);
    return res.status(500).json({
      success: false,
      message: "Invalid student ID",
      error: error.message,
    });
  }
};

/**
 * Delete Student by ID
 */
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await Student.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete Student Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
