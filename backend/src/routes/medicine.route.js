import express from 'express';
import * as medicineController from '../modules/medicines/medicine.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

// Medicine routes
router.post('/', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), medicineController.create);
router.get('/', authMiddleware, medicineController.getAll); 
router.get('/:id', authMiddleware, medicineController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), medicineController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), medicineController.remove);

export default router;