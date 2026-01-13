import User from "../../models/User.js";

// @desc    Get User Profile
// @route   GET /api/auth/profile
export const getProfile = async (req, res) => {
  try {
    // Fetch user and exclude sensitive fields
    // Added 'role' and 'isPhoneVerified' to ensure frontend has all UI data
    const user = await User.findById(req.user.id).select(
      "-password -otpCode -otpExpires"
    );

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Fetch Profile Error:", err.message);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

// @desc    Update User Profile (Text Data)
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Destructure fields from frontend
    const {
      fullName,
      phone,
      dob,
      state,
      education,
      gender,
      maritalStatus,
      address,
    } = req.body;

    // Update only if fields are provided in the request
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (dob !== undefined) user.dob = dob;
    if (state !== undefined) user.state = state;
    if (education !== undefined) user.education = education;
    if (gender !== undefined) user.gender = gender;
    if (maritalStatus !== undefined) user.maritalStatus = maritalStatus;
    if (address !== undefined) user.address = address;

    // IMPORTANT: We do NOT allow 'role' to be updated here for security.
    // If a Student could send { role: 'Admin' } in the body, they could hack the system.

    await user.save();

    // Prepare response (exclude password and OTP data)
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.otpCode;
    delete updatedUser.otpExpires;

    res.status(200).json({
      success: true,
      msg: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("Update Profile Error:", err.message);
    res
      .status(500)
      .json({ success: false, msg: "Update failed: Server Error" });
  }
};
