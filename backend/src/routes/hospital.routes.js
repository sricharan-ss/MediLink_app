import express from 'express';
import { adminAuthMiddleware, authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import { createHospital, getHospitals, getHospitalById, updateHospitalController } from '../modules/hospitals/createHospital.controller.js';
const router = express.Router();

router.post('/create-hospital', adminAuthMiddleware, createHospital);
router.get('/', authMiddleware, getHospitals);
router.get('/:id', authMiddleware, getHospitalById);
router.put('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), updateHospitalController);

export default router;
