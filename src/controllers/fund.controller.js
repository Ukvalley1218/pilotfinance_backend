import { Fund } from "../models/fund.model.js";

export const getAllFunds = async (req, res) => {
  try {
    const funds = await Fund.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: funds });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching funds" });
  }
};

export const addFund = async (req, res) => {
  try {
    const fund = await Fund.create(req.body);
    res.status(201).json({ success: true, data: fund });
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid fund data" });
  }
};
