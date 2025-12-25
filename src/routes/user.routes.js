import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(adminMiddleware);

// Get user statistics
router.get('/stats', getUserStats);

// Get all users
router.get('/', getAllUsers);

// Get single user
router.get('/:id', getUserById);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

export default router;