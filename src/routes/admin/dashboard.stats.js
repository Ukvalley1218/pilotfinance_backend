import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { getAdminDashboardStats} from "../../controllers/admin/getAdminDashboardStats.js";

const router = express.Router();

router.get("/", protect, getAdminDashboardStats);

export default router;