import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Professional Check: Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Service Error:", error.message);
  } else {
    console.log("📧 Email Service Ready to send OTPs");
  }
});

export default transporter;
