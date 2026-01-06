import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "./src/models/User.model.js";

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to your MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    // Create a hashed password for "admin123"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    // Create the admin user
    const admin = new User({
      name: "Admin User",
      email: "admin@test.com",
      password: hashedPassword,
    });

    await admin.save();
    console.log("✅ Admin created! Login with: admin@test.com / admin123");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

createAdmin();
