import express from 'express';
import * as patientController from '../modules/patients/patient.controller.js';
import * as admittedPatientController from '../modules/admitted_patients/admitted_patient.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

//Admitted Patient Routes
router.post('/admitted', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN','SUPER_ADMIN']), admittedPatientController.create);
router.put('/admitted/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN','SUPER_ADMIN']), admittedPatientController.update);
router.delete('/admitted/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), admittedPatientController.remove);
router.get('/admitted/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'PATIENT', 'SUPER_ADMIN']), admittedPatientController.getById);
router.get('/admitted', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN','SUPER_ADMIN']), admittedPatientController.getAll);

// Patient Routes
router.put('/me/profile', authMiddleware, patientController.upsertMyProfile);
router.post('/', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), patientController.create);
router.get('/', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), patientController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), patientController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), patientController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), patientController.remove);

export default router;
