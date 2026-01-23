import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Establishment of a professional MongoDB connection.
 * Includes connection pooling and error handling logic.
 */
const connectDB = async () => {
  try {
    // Check if URI exists to prevent runtime crashes
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // Professional: ensures unique constraints (like email) are enforced
      maxPoolSize: 10, // Allows multiple concurrent Admin/User requests
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if DB is unreachable
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Monitoring Connection Events
    mongoose.connection.on("error", (err) => {
      console.error(`❌ Database persistent error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB connection lost. Attempting to reconnect...");
    });
  } catch (err) {
    console.error("❌ MongoDB Initial Connection Error:", err.message);
    process.exit(1); // Immediate exit to prevent the server from running in a broken state
  }
};

export default connectDB;
