import express from 'express';
import * as doctorController from '../modules/doctors/doctor.controller.js';
import * as doctorScheduleController from '../modules/doctor_schedules/doctor_schedule.controller.js';
import * as doctorHospitalController from '../modules/doctor_hospitals/doctor_hospital.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

//Doctor Schedule Routes
router.post('/doctor-schedule', authMiddleware, roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorScheduleController.create);
router.get('/doctor-schedule', authMiddleware, roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorScheduleController.getAll);
router.get('/doctor-schedule/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorScheduleController.getById);
router.put('/doctor-schedule/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorScheduleController.update);
router.delete('/doctor-schedule/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorScheduleController.remove);

//Doctor Hospital Routes
router.post('/doctor-hospital', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorHospitalController.create);
router.get('/doctor-hospital', authMiddleware, roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorHospitalController.getAll);
router.get('/doctor-hospital/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorHospitalController.getById);
router.put('/doctor-hospital/:id', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorHospitalController.update);
router.delete('/doctor-hospital/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorHospitalController.remove);

// Doctor routes
router.post('/', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), doctorController.remove);

export default router;