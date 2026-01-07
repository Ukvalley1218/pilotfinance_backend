import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Import the Routes
import authRoutes from "./src/routes/auth.routes.js";
import studentRoutes from "./src/routes/student.routes.js";
import partnerRoutes from "./src/routes/partner.routes.js";
import loanRoutes from "./src/routes/loan.routes.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/loan", loanRoutes);

app.get("/", (req, res) => {
  res.send("Piolet Finance API Running 🚀");
});

// Server Initialization
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
