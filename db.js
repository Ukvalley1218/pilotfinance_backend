import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Create the main connection pool
const mainConnection = mongoose.createConnection(process.env.MONGO_URI);

mainConnection.on("connected", () => {
  console.log("✅ Main MongoDB Cluster Connected");
});

mainConnection.on("error", (err) => {
  console.error("❌ MongoDB Connection Error:", err);
});

// useCache: true ensures that Mongoose reuses the database instance
// instead of creating a new one every time this file is imported.
export const dbOne = mainConnection.useDb("database_one", { useCache: true });
