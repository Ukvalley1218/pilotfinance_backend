import User from "../../models/User.js";
import { Student } from "../../models/student.model.js"; // IMPORT STUDENT MODEL
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../../utils/mail.js";
import { generateToken } from "../../utils/generateToken.js";
import fetch from "node-fetch";

// --- 1. GET CURRENT USER ---
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otpCode -otpExpires",
    );
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. UPDATE PROFILE TEXT DATA ---
export const updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = [
      "fullName",
      "phone",
      "dob",
      "state",
      "address",
      "education",
      "gender",
      "maritalStatus",
    ];

    let updateObj = {};
    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) updateObj[field] = req.body[field];
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateObj },
      { new: true, runValidators: true },
    ).select("-password");

    // SYNC: Update the corresponding Student model so Admin sees changes
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { name: updateObj.fullName, phone: updateObj.phone } },
    );

    return res
      .status(200)
      .json({ success: true, msg: "Profile updated", data: updatedUser });
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Update failed" });
  }
};

// --- 3. UPDATE PROFILE PICTURE ---
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, msg: "No file uploaded" });

    const avatarPath = `${req.protocol}://${req.get("host")}/uploads/avatars/${
      req.file.filename
    }`;

    await User.findByIdAndUpdate(req.user.id, { avatar: avatarPath });

    return res.status(200).json({ success: true, avatarUrl: avatarPath });
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Image upload failed" });
  }
};

// --- 4. REGISTER (SYNCED WITH ADMIN) ---
export const register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !email || !password)
      return res.status(400).json({ msg: "All fields are required" });

    const cleanEmail = email.toLowerCase().trim();
    let userExists = await User.findOne({ email: cleanEmail });
    if (userExists)
      return res.status(400).json({ msg: "Email already registered" });

    // A. Create User record (Auth)
    const user = new User({
      fullName,
      email: cleanEmail,
      password,
      phone,
      role: "student",
    });
    await user.save();

    // B. Create Student record (Admin Visibility Bridge)
    await Student.create({
      userId: user._id,
      name: fullName,
      email: cleanEmail,
      phone: phone || "Not Provided",
      status: "Pending",
    });

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      token,
      userId: user._id,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err) {
    console.error("REGISTRATION SYNC ERROR:", err);
    return res.status(500).json({ msg: "Registration failed" });
  }
};

// --- 5. LOGIN (Updated for Smart Redirect) ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ msg: "Enter credentials" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = generateToken(user._id);

    // Explicitly returning isPhoneVerified so frontend can redirect to Dashboard
    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Login error" });
  }
};

// --- 6. GOOGLE LOGIN (SYNCED WITH ADMIN) ---
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`,
    );
    const googleUser = await googleRes.json();

    if (!googleUser.email)
      return res.status(400).json({ msg: "Google authentication failed" });

    let user = await User.findOne({
      email: googleUser.email.toLowerCase().trim(),
    });

    if (!user) {
      // Create new User
      user = new User({
        fullName: googleUser.name,
        email: googleUser.email.toLowerCase().trim(),
        password: Math.random().toString(36).slice(-10),
        avatar: googleUser.picture,
        isEmailVerified: true,
        isPhoneVerified: true, // Google accounts verified by default
        role: "student",
      });
      await user.save();

      // Create linked Student for Admin Panel
      await Student.create({
        userId: user._id,
        name: googleUser.name,
        email: googleUser.email.toLowerCase().trim(),
        status: "Pending",
      });
    }

    const jwtToken = generateToken(user._id);
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("GOOGLE LOGIN SYNC ERROR:", err);
    return res.status(500).json({ msg: "Google Login Error" });
  }
};

// --- 7. FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60000);
    await user.save();

    await transporter.sendMail({
      from: `"Pilot Finance" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `<h2>OTP: ${otp}</h2>`,
    });
    return res.status(200).json({ success: true, msg: "OTP sent" });
  } catch (err) {
    return res.status(500).json({ msg: "Failed to send reset code" });
  }
};

// --- 8. RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      otpCode: otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ msg: "Invalid or expired OTP" });

    user.password = newPassword;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, msg: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ msg: "Reset failed" });
  }
};

// --- 9. SEND VERIFICATION OTP ---
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { otpCode: otp, otpExpires: new Date(Date.now() + 10 * 60000) },
      { new: true },
    );

    if (!user) return res.status(404).json({ msg: "User not found" });

    await transporter.sendMail({
      from: `"Pilot Finance" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verification Code",
      html: `<h2>Your verification code is: ${otp}</h2>`,
    });
    return res
      .status(200)
      .json({ success: true, msg: "Code sent", userId: user._id });
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Failed to send OTP" });
  }
};

// --- 10. VERIFY OTP ---
export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);

    if (!user || user.otpCode !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ msg: "Invalid or expired code" });
    }

    user.isEmailVerified = true;
    user.isPhoneVerified = true;

    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err) {
    return res.status(500).json({ msg: "Verification failed" });
  }
};
