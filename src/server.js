import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB, disconnectDB } from "./config/db.js";
import cookieParser from "cookie-parser";

// Import all our workflow routes
import requestRoutes from "./routes/request.routes.js";
import sourcingRoutes from "./routes/sourcing.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import executionRoutes from "./routes/execution.routes.js";
import finalRoutes from "./routes/final.routes.js";
import authRoutes from "./routes/auth.routes.js";

connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes); // Phase 1
app.use("/api/requests", sourcingRoutes); // Phase 2
app.use("/api/approvals", approvalRoutes); // Phase 3 (Approvals base route)
app.use("/api", approvalRoutes); // Phase 3 (Ghost Diff/Resubmit mapped to /requests/...)
app.use("/api/requests", executionRoutes); // Phase 4
app.use("/api/inventory", executionRoutes); // Phase 5 (Inventory base route)
app.use("/api", finalRoutes); // Phase 6 & Admin (/vendors, /requests/:id/history)

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("unhandledRejection", async (err) => {
  console.error("Unhandled Rejection: ", err);
  await disconnectDB();
  process.exit(1);
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception: ", err);
  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});
