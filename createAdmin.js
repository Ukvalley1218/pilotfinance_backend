import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js"; // Ensure this filename is exactly 'User.js'

dotenv.config();

/**
 * @desc Quick script to seed or update the Master Admin user
 * Run this using: node createAdmin.js
 */
const createAdmin = async () => {
  try {
    // 1. Check for MONGO_URI
    if (!process.env.MONGO_URI) {
      console.error("❌ ERROR: MONGO_URI is missing in .env file");
      process.exit(1);
    }

    // 2. Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📡 Connected to MongoDB...");

    // 3. Prepare Admin Data
    /**
     * NOTE: We pass the plain password 'admin123'.
     * The pre-save hook in your src/models/User.js will handle the hashing.
     */
    const adminData = {
      fullName: "Master Admin",
      email: "admin@test.com",
      password: "admin123",
      role: "Admin", // Matches the enum ["Super Admin", "Admin", ...] in User.js
      isPhoneVerified: true,
      kycStatus: "Verified",
    };

    // 4. Use findOneAndReplace or findOne + save to trigger pre-save hooks
    // Using findOne and then saving is better for triggering Mongoose hooks
    let user = await User.findOne({ email: "admin@test.com" });

    if (user) {
      console.log("🔄 Admin exists. Updating record...");
      user.fullName = adminData.fullName;
      user.password = adminData.password; // This will trigger the pre-save hash
      user.role = adminData.role;
      await user.save();
    } else {
      console.log("✨ Creating new Admin...");
      user = new User(adminData);
      await user.save();
    }

    console.log("------------------------------------------");
    console.log("✅ Admin Operation Successful!");
    console.log("📧 Email: admin@test.com");
    console.log("🔑 Password: admin123");
    console.log("📡 Role: Admin");
    console.log("------------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("❌ Script Error:", error.message);
    process.exit(1);
  }
};

createAdmin();
