import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (Require JWT Token)
router.get("/profile", protect, getProfile);

// We use both "/profile" and "/update-profile" to ensure
// compatibility with  frontend API calls
router.put("/profile", protect, updateProfile);
router.put("/update-profile", protect, updateProfile);

export default router;
