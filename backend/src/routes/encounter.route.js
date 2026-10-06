import express from 'express';
import * as encounterController from '../modules/encounters/encounter.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

// Encounter routes
router.post('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), encounterController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), encounterController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), encounterController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), encounterController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), encounterController.remove);

export default router;
