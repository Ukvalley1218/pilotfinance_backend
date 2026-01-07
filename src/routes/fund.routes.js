import express from "express";
import { getAllFunds, addFund } from "../controllers/fund.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", protect, getAllFunds); // Matches frontend calls
router.post("/add", protect, addFund);

export default router;
