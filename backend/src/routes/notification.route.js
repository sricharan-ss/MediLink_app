import express from 'express';
const router = express.Router();
import * as notificationController from '../modules/notifications/notification.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

// Notification routes
router.post('/', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), notificationController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), notificationController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), notificationController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), notificationController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), notificationController.remove);

export default router;
