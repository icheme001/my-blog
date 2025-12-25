import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from './routes/comment.routes.js';
import likeRoutes from './routes/like.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorMiddleware } from "./middleware/error.middleware.js";
import newsletterRoutes from './routes/newsletter.routes.js';

const app = express();

app.use('/uploads', express.static('uploads'));
// Global Middlewares
app.use(cors());
app.use(express.json());


app.use('/api/users', userRoutes);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use('/api', commentRoutes);
app.use('/api', likeRoutes);

// Error Handler
app.use(errorMiddleware);

app.use('/api/newsletter', newsletterRoutes);

export default app;

