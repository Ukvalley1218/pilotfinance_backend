import express from "express";
import { protect } from "../middleware/auth.middleware.js";
// You can create a simple controller later; for now, we define the paths
const router = express.Router();

router.get("/all", protect, (req, res) =>
  res.json({ success: true, data: [] })
);

export default router;
