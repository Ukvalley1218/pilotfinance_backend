import mongoose from "mongoose";

const DEFAULT_FOLDER_URL =
  "https://drive.google.com/drive/folders/1D8Te9vuhNYpCYA2hDSp7AA-cnvWDQR5R";

const TourConfigSchema = new mongoose.Schema(
  {
    // Google Drive folder holding the tour videos
    folderUrl: { type: String, default: DEFAULT_FOLDER_URL, trim: true },
    // Admin toggle: show the App Tour tab in the recruitment panel or not
    showInRecruitment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TourConfig = mongoose.model("TourConfig", TourConfigSchema);

export { DEFAULT_FOLDER_URL };
export default TourConfig;