import jwt from "jsonwebtoken";

/**
 * @desc Generate a JWT Token for authenticated sessions
 * @param {string} userId - The MongoDB user ID
 * @returns {string} - Signed JWT token
 */
export const generateToken = (userId) => {
  // Fallback to '30d' if process.env.JWT_EXPIRES_IN is not defined in .env
  const expiresIn = process.env.JWT_EXPIRES_IN || "30d";

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: expiresIn,
  });
};
