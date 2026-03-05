import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.route";
import ApiError from "./utils/ApiError";
import { Request, Response, NextFunction } from "express";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/", authRoute);

// Global error handler - serialises ApiError instances
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      data: err.data,
      message: err.message,
      success: err.success,
      errors: err.errors,
    });
  }
  return res.status(500).json({
    statusCode: 500,
    data: null,
    message: err.message || "Internal Server Error",
    success: false,
    errors: [],
  });
});

export default app;
