import express from 'express';
import { create } from '../modules/inventory_managers/inventory_manager.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/create',authMiddleware, create);

export default router;
