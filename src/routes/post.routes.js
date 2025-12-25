import express from "express";
import multer from "multer";
import { supabase } from "../config/db.js";
import { authenticate } from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";
import { canModifyPost } from "../middleware/ownership.middleware.js";
import {
  createPost,
  getAllPosts,
  getPostBySlug,
  getPostById,      // <-- ADD THIS
  editPost,
  deletePost,
  getAllPostsAdmin,
  getPostByIdAdmin,
  getUserPosts
} from "../controllers/post.controller.js";

const router = express.Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// IMPORTANT: Order matters! Specific routes BEFORE generic catch-all routes

// 1. Admin routes (most specific)
router.get("/admin/all", authenticate, adminMiddleware, getAllPostsAdmin);
router.get("/admin/:id", authenticate, adminMiddleware, getPostByIdAdmin);

// 2. User's own posts
router.get("/my-posts", authenticate, getUserPosts);

// 3. Edit route (specific - before /:slug)
router.get("/edit/:id", authenticate, getPostById);

// 4. Image upload (any authenticated user)
router.post("/upload", authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: `Failed to upload to storage: ${error.message}` });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(filePath);

    res.json({ imageUrl: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// 5. Create post (any authenticated user)
router.post("/", authenticate, createPost);

// 6. Update and delete - Admin OR Post Owner
router.put("/:id", authenticate, canModifyPost, editPost);
router.delete("/:id", authenticate, canModifyPost, deletePost);

// 7. Public routes (LAST - most generic)
router.get("/", getAllPosts);
router.get("/:slug", getPostBySlug); // This must be LAST - catches everything

export default router;