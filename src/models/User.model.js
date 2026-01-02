import mongoose from "mongoose";
// 1. UPDATED: Import dbOne from db.js (root) instead of server.js
import { dbOne } from "../../db.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
  },
  { timestamps: true }
);

// 2. Attach the schema to the correct database instance exported from db.js
export const User = dbOne.model("User", userSchema);
