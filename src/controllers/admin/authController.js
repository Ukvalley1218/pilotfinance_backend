import User from "../../models/User.js";
import { generateToken } from "../../utils/generateToken.js";

/**
 * @desc    Register Admin/Staff
 * @route   POST /api/admin/auth/register
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    /**
     * MASTER MODEL INTEGRATION:
     * We pass the plain password. The pre-save hook in models/User.js
     * automatically handles the bcrypt hashing.
     */
    const user = await User.create({
      fullName: name,
      email: cleanEmail,
      password,
      role: "admin",
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
};

/**
 * @desc    Login Admin/Staff
 * @route   POST /api/admin/auth/login
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Using the comparePassword method defined in your User Schema
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
};

/**
 * @desc    Get Current Logged-in Profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

/**
 * @desc    Update Name, Email, Contact, and Preferences
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, contact, role, preferences } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res
          .status(409)
          .json({ success: false, message: "Email already in use" });
      }
      user.email = email.toLowerCase();
    }

    // Direct Mapping to Master User Schema fields
    if (name) user.fullName = name;
    if (contact) user.phone = contact;
    if (role) user.role = role.toLowerCase();

    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        contact: user.phone,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ success: false, message: "Update failed" });
  }
};

/**
 * @desc    Change User Password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password incorrect" });
    }

    user.password = newPassword; // Pre-save hook will hash this
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Password update failed" });
  }
};
