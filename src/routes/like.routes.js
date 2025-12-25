import express from 'express';
import { checkLike, likePost, unlikePost, getLikeCount } from '../controllers/like.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Check if user has liked a post (requires authentication)
router.get('/posts/:postId/likes/check', authenticate, checkLike);

// Get like count for a post (public)
router.get('/posts/:postId/likes/count', getLikeCount);

// Like a post (requires authentication)
router.post('/posts/:postId/likes', authenticate, likePost);

// Unlike a post (requires authentication)
router.delete('/posts/:postId/likes', authenticate, unlikePost);

export default router;