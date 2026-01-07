import express from "express";
import {
  getLedger,
  getBalance,
  withdrawFunds,
} from "../controllers/finance.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/ledger", protect, getLedger);
router.get("/balance", protect, getBalance);
router.post("/withdraw", protect, withdrawFunds);

export default router;
