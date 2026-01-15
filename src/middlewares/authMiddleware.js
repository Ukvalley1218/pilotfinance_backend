import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Unified User model

export const protect = async (req, res, next) => {
  let token;

  // 1. Check for token in various headers (Shared by User, Admin, and Recruitment panels)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.header("x-auth-token")) {
    token = req.header("x-auth-token");
  }

  // 2. If no token, deny access
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token, authorization denied",
    });
  }

  try {
    // 3. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Extract User ID (Handles payload from User, Admin, or Partner logins)
    const userId = decoded.id || (decoded.user ? decoded.user.id : null);

    if (!userId) {
      throw new Error("Invalid Token Payload: Missing User ID");
    }

    // 5. Fetch User from Database
    // Using a try-catch inner block to catch specifically DB Timeouts
    req.user = await User.findById(userId).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists. Please login again.",
      });
    }

    next();
  } catch (error) {
    console.error("🔥 AUTH MIDDLEWARE ERROR:", error.message);

    // Handle Database Connection/Timeout Errors
    if (
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("topology")
    ) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed. Please check your network.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

/**
 * RECRUITMENT PARTNER MIDDLEWARE
 * Ensures the logged-in user has the 'Partner' role
 */
export const partnerOnly = (req, res, next) => {
  if (req.user && req.user.role === "Partner") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied: Recruitment Partners only",
    });
  }
};

/**
 * ADMIN MIDDLEWARE
 * Strictly for Admin and Super Admin roles
 */
export const adminOnly = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "Admin" || req.user.role === "Super Admin")
  ) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied: Admins only",
    });
  }
};
