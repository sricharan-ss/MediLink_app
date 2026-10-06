import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import * as prescriptionController from '../modules/prescriptions/prescription.controller.js';
import * as prescriptionMedicineController from '../modules/prescription_medicines/prescription_medicine.controller.js';
import * as diagnosisController from '../modules/diagnosis/diagnosis.controller.js';

const router = express.Router();

// Prescription routes
router.post('/', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionController.remove);

//Prescription Medication Routes
router.post('/:prescriptionId/medications', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionMedicineController.create);
router.get('/:prescriptionId/medications', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionMedicineController.getAll);
router.get('/:prescriptionId/medications/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionMedicineController.getById);
router.put('/:prescriptionId/medications/:id', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionMedicineController.update);
router.delete('/:prescriptionId/medications/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), prescriptionMedicineController.remove);

// Diagnosis Routes
router.post('/:prescriptionId/diagnoses', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), diagnosisController.create);
router.get('/:prescriptionId/diagnoses', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), diagnosisController.getAll);
router.get('/:prescriptionId/diagnoses/:id', authMiddleware, roleMiddleware(['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), diagnosisController.getById);
router.put('/:prescriptionId/diagnoses/:id', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), diagnosisController.update);
router.delete('/:prescriptionId/diagnoses/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), diagnosisController.remove);

export default router;
