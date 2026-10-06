import express from 'express';
const router = express.Router();
import * as vitalController from '../modules/vitals/vital.controller.js';
import * as vitalTypeController from '../modules/vital_types/vital_type.controller.js';
import * as deviceController from '../modules/devices/device.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

// Vital Type routes
router.post('/types', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalTypeController.create);
router.get('/types', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalTypeController.getAll);
router.get('/types/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalTypeController.getById);
router.put('/types/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalTypeController.update);
router.delete('/types/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalTypeController.remove);

// Device routes
router.post('/devices', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), deviceController.create);
router.get('/devices', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), deviceController.getAll);
router.get('/devices/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), deviceController.getById);
router.put('/devices/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), deviceController.update);
router.delete('/devices/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), deviceController.remove);

// Vital routes
router.post('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), vitalController.remove);

export default router;
