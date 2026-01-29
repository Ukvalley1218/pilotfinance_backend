import mongoose from "mongoose";

// A simple schema to store the rates.
// You can also add this to your existing database models if preferred.
const LoanSettingSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  interestRate: { type: Number, default: 2.5 },
  minAmount: { type: Number, default: 500 },
  maxAmount: { type: Number, default: 50000 },
});

const LoanSetting = mongoose.model("LoanSetting", LoanSettingSchema);

export const getLoanSettings = async (req, res) => {
  try {
    const settings = await LoanSetting.find();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLoanSettings = async (req, res) => {
  try {
    const { configs } = req.body;
    for (const config of configs) {
      await LoanSetting.findOneAndUpdate(
        { category: config.category },
        config,
        { upsert: true },
      );
    }
    res.status(200).json({ success: true, message: "Settings updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
