import express from 'express';
import { getComments, createComment, deleteComment } from '../controllers/comment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';  // Changed here

const router = express.Router();

// Get all comments for a post (public)
router.get('/posts/:postId/comments', getComments);

// Create a comment (requires authentication)
router.post('/posts/:postId/comments', authenticate, createComment);  // Changed here

// Delete a comment (requires authentication)
router.delete('/comments/:id', authenticate, deleteComment);  // Changed here

export default router;