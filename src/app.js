import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import likeRoutes from "./routes/like.routes.js";
import userRoutes from "./routes/user.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

/* ===========================
   GLOBAL MIDDLEWARES
=========================== */

// CORS (restrict in production)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://YOUR_FRONTEND_DOMAIN.vercel.app"
    ],
    credentials: true
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ===========================
   HEALTH CHECK
=========================== */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Blog API is running 🚀"
  });
});

/* ===========================
   API ROUTES
=========================== */
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api", commentRoutes);
app.use("/api", likeRoutes);

/* ===========================
   ERROR HANDLER (LAST)
=========================== */
app.use(errorMiddleware);

export default app;
