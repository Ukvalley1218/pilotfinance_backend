import { Notification } from "../../models/notification.model.js";

/**
 * @desc Get latest 10 notifications
 * @route GET /api/admin/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching notifications" });
  }
};

/**
 * @desc Mark all unread notifications as read
 * @route PUT /api/admin/notifications/read
 */
export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    res.status(200).json({ success: true, message: "All marked as read" });
  } catch (error) {
    console.error("Update Notifications Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating notifications" });
  }
};
