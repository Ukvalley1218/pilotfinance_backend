import express from "express";
const router = express.Router();
import { processPayment } from "../controllers/user/paymentController.js";
import { protect } from "../../middleware/authMiddleware.js";

router.post("/pay", protect, processPayment);

export default router;
