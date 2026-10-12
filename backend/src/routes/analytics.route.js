import express from 'express';
import { getDashboardStats } from '../modules/analytics/analytics.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  getDashboardStats
);

export default router;
