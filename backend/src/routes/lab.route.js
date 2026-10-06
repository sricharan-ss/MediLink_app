import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import * as labController from '../modules/labs/lab.controller.js';
import * as labScheduleController from '../modules/lab_schedules/lab_schedule.controller.js';

const router = express.Router();

// Lab routes (discovery/scheduling context)
router.post('/', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labController.getAll);

// Lab schedule routes
router.post('/schedules', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labScheduleController.create);
router.get('/schedules', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labScheduleController.getAll);
router.get('/schedules/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labScheduleController.getById);
router.put('/schedules/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labScheduleController.update);
router.delete('/schedules/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), labScheduleController.remove);

router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), labController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), labController.remove);

export default router;
