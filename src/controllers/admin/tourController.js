import TourConfig, {
  DEFAULT_FOLDER_URL,
} from "../../models/tour.model.js";

/**
 * Convert a Google Drive link into an embeddable URL.
 * - Folder link -> embedded folder grid view
 * - File link    -> file preview player
 */
export const toEmbedUrl = (url = "") => {
  const folderMatch = url.match(
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/
  );
  if (folderMatch) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  return url;
};

// Fetch (or create on first use) the single tour config document
const getTourConfig = async () => {
  let config = await TourConfig.findOne();
  if (!config) {
    config = await TourConfig.create({ folderUrl: DEFAULT_FOLDER_URL });
  }
  return config;
};

/**
 * @route   GET /api/admin/tour
 * @desc    Get tour settings (admin panel)
 * @access  Private (Admin)
 */
export const getTourSettings = async (req, res) => {
  try {
    const config = await getTourConfig();
    res.status(200).json({
      success: true,
      data: {
        folderUrl: config.folderUrl,
        embedUrl: toEmbedUrl(config.folderUrl),
        showInRecruitment: config.showInRecruitment,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/admin/tour
 * @desc    Update tour settings (folder link / show in recruitment panel)
 * @access  Private (Admin)
 */
export const updateTourSettings = async (req, res) => {
  try {
    const { folderUrl, showInRecruitment } = req.body;

    const update = {};
    if (typeof folderUrl === "string" && folderUrl.trim()) {
      update.folderUrl = folderUrl.trim();
    }
    if (typeof showInRecruitment === "boolean") {
      update.showInRecruitment = showInRecruitment;
    }

    const config = await TourConfig.findOneAndUpdate({}, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    res.status(200).json({
      success: true,
      message: "Tour settings updated",
      data: {
        folderUrl: config.folderUrl,
        embedUrl: toEmbedUrl(config.folderUrl),
        showInRecruitment: config.showInRecruitment,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/tour
 * @desc    Public tour info for panels (folder link + visibility flag)
 * @access  Public
 */
export const getPublicTour = async (req, res) => {
  try {
    const config = await getTourConfig();
    res.status(200).json({
      success: true,
      data: {
        folderUrl: config.folderUrl,
        embedUrl: toEmbedUrl(config.folderUrl),
        showInRecruitment: config.showInRecruitment,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};