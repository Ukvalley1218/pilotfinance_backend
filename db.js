import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options ensure your connection is stable and professional
      autoIndex: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // If your Admin specifically needs 'database_one', we can access it like this:
    // This allows you to keep using your 'dbOne' variable if needed
    const dbOne = conn.connection.useDb("database_one", { useCache: true });
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1); // Stop the server if the DB is down
  }
};

export default connectDB;
