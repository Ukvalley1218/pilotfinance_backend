import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user in the new dbOne instance
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        // This is likely why you see 500 errors if the user isn't in the new DB
        return res.status(401).json({
          success: false,
          message: "User not found in new database. Please register again.",
        });
      }

      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again.",
      });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token, authorization denied" });
  }
};
