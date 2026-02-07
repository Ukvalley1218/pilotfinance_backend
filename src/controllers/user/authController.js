import User from "../../models/User.js";
import { Student } from "../../models/student.model.js"; // IMPORT STUDENT MODEL
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../../utils/mail.js";
import { generateToken } from "../../utils/generateToken.js";
import fetch from "node-fetch";
import cloudinary from "../../services/cloudinary.service.js";
import streamifier from "streamifier";


// --- 1. GET CURRENT USER ---
export const getMe = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password -otpCode -otpExpires");
if (!student) return res.status(404).json({ msg: "Student not found" });

res.status(200).json({ success: true, data: student });

  } catch (err) {
    return res.status(500).json({ success: false, msg: "Server Error" });
  }
};

// --- 2. UPDATE PROFILE TEXT DATA ---
export const updateProfile = async (req, res) => {
  try {
    const fields = ["name", "phone", "address", "dob", "education", "gender"];

    let updateObj = {};
    fields.forEach(field => {
      if (req.body[field] !== undefined) updateObj[field] = req.body[field];
    });

    const updatedStudent = await Student.findByIdAndUpdate(
      req.user.id,
      { $set: updateObj },
      { new: true }
    ).select("-password");

    res.status(200).json({ success: true, data: updatedStudent });
  } catch {
    res.status(500).json({ msg: "Update failed" });
  }
};


// --- 3. UPDATE PROFILE PICTURE ---
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, msg: "No file uploaded" });
    }

    // Upload buffer to Cloudinary
    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "pilot-finance/avatars",
            public_id: `user-${req.user.id}`,
            overwrite: true,
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });

    const result = await streamUpload(req.file.buffer);

    // Save Cloudinary URL to user
    await Student.findByIdAndUpdate(req.user.id, { avatar: result.secure_url });


    return res.status(200).json({
      success: true,
      avatarUrl: result.secure_url,
    });
  } catch (err) {
    console.error("CLOUDINARY AVATAR ERROR:", err);
    return res.status(500).json({ success: false, msg: "Image upload failed" });
  }
};




// --- 5. LOGIN (Updated for Smart Redirect) ---
export const login = async (req, res) => {
  try {
    console.log("🔐 Login attempt received");
    console.log("📩 Request body:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log("📧 Searching for student with email:", cleanEmail);

    // 1️⃣ Find student
    const student = await Student.findOne({ email: cleanEmail });

    if (!student) {
      console.log("❌ No student found with that email");
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    console.log("✅ Student found:", {
      id: student._id,
      email: student.email,
      hasPassword: !!student.password,
    });

    // 2️⃣ Compare password
   console.log("🔑 Comparing password...");

// If password in DB is already bcrypt hash
if (student.password.startsWith("$2")) {
  const isMatch = await bcrypt.compare(password, student.password);
  if (!isMatch) {
    console.log("❌ Password does not match (bcrypt)");
    return res.status(400).json({ msg: "Invalid credentials" });
  }
} else {
  // Old plain-text password case
  console.log("⚠️ Plain text password detected. Auto-upgrading...");

  if (password !== student.password) {
    console.log("❌ Password does not match (plain)");
    return res.status(400).json({ msg: "Invalid credentials" });
  }

  // Upgrade to hashed password
  const salt = await bcrypt.genSalt(10);
  student.password = await bcrypt.hash(password, salt);
  await student.save();
  console.log("🔄 Password upgraded to bcrypt hash");
}

console.log("✅ Password matched");

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    console.log("✅ Password matched");

    // 3️⃣ Generate token
    console.log("🪪 Generating token...");
    const token = generateToken(student._id);

    console.log("🎉 Login successful for:", student.email);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: student._id,
        fullName: student.name,
        email: student.email,
        role: "Student",
        avatar: student.avatar,
      },
    });
  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    res.status(500).json({ msg: "Login error", error: error.message });
  }
};


// --- 7. FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
   const student = await Student.findOne({ email: email });
    if (!student) return res.status(404).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
 student.otpCode = otp;
student.otpExpires = new Date(Date.now() + 10 * 60000);
    await student.save();

    await transporter.sendMail({
      from: `"Pilot Finance" <${process.env.EMAIL_USER}>`,
      to: student.email,
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
    const student = await Student.findOne({
  email: cleanEmail,
  otpCode: otp,
  otpExpires: { $gt: Date.now() }
});

    if (!student) return res.status(400).json({ msg: "Invalid or expired OTP" });

    student.password = await bcrypt.hash(newPassword, 10);
student.otpCode = undefined;
student.otpExpires = undefined;
await student.save();

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
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 1️⃣ Store OTP in DB FIRST
    const student = await Student.findOneAndUpdate(
  { email: cleanEmail },
  { otpCode: otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) },
  { new: true }
);

console.log("Otp",otp)
    if (!student) {
      return res.status(404).json({ msg: "User not found" });
    }

    // 2️⃣ Try sending email (non-blocking logic)
    try {
      await transporter.sendMail({
        from: `"Pilot Finance" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: "Verification Code",
        html: `<h2>Your verification code is: ${otp}</h2>`,
      });
    } catch (mailError) {
      console.error("EMAIL FAILED BUT OTP SAVED:", mailError.message);
    }

    // 3️⃣ Always respond success once OTP is stored
    return res.status(200).json({
      success: true,
      msg: "OTP generated successfully",
      userId: student._id,
    });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to generate OTP",
    });
  }
};


// --- 10. VERIFY OTP ---
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required" });
    }

    const cleanEmail = email.trim();

    const student = await Student.findOne({ email: cleanEmail });

    if (
      !student ||
      student.otpCode !== String(otp) ||
      !student.otpExpires ||
      student.otpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({ msg: "Invalid or expired code" });
    }

    student.isEmailVerified = true;
    student.otpCode = undefined;
    student.otpExpires = undefined;
    await student.save();

    const token = generateToken(student._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ msg: "Verification failed" });
  }
};


