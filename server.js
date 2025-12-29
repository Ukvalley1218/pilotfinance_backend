import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes.js";
import studentRoutes from "./src/routes/student.routes.js";
import partnerRoutes from "./src/routes/partner.routes.js";
import loanRoutes from "./src/routes/loan.routes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/loan", loanRoutes);

app.get("/", (req, res) => {
  res.send("Auth API Running 🚀");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
