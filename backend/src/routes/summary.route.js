import express from 'express';
import * as summaryController from '../modules/summaries/summary.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  summaryController.create
);

router.get(
  '/',
  authMiddleware,
  roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  summaryController.getAll
);

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  summaryController.getById
);

export default router;
