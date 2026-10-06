import express from 'express';
import { adminAuthMiddleware, authMiddleware } from '../middleware/authMiddleware.js';
import { createHospital, getHospitals, getHospitalById } from '../modules/hospitals/createHospital.controller.js';
const router = express.Router();

router.post('/create-hospital', adminAuthMiddleware, createHospital);
router.get('/', authMiddleware, getHospitals);
router.get('/:id', authMiddleware, getHospitalById);

export default router;
