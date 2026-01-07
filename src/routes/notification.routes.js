import express from "express";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAsRead);

export default router;
