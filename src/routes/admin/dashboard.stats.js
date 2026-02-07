import express from "express";
import { protect,adminOnly } from "../../middlewares/authMiddleware.js";
import { getAdminDashboardStats} from "../../controllers/admin/getAdminDashboardStats.js";

const router = express.Router();

router.get("/", protect,adminOnly, getAdminDashboardStats);

export default router;