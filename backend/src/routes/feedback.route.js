import express from 'express';

const router = express.Router();
import * as feedbackController from '../modules/feedback/feedback.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

// Feedback routes
router.post('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), feedbackController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), feedbackController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), feedbackController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), feedbackController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), feedbackController.remove);

export default router;
