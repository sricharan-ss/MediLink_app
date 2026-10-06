import express from 'express';
import * as inventoryController from '../modules/inventory/inventory.controller.js';
import * as inventoryManagerController from '../modules/inventory_managers/inventory_manager.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

//Inventory routes
router.post('/', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryController.create);
router.get('/', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryController.remove);

//Inventory Manager routes
router.post('/managers', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryManagerController.create);
router.get('/managers', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryManagerController.getAll);
router.get('/managers/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryManagerController.getById);
router.put('/managers/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryManagerController.update);
router.delete('/managers/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), inventoryManagerController.remove);

export default router;
