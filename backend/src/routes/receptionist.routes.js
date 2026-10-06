import express from 'express';
import { createReceptionist } from '../modules/receptionists/receptionist.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/create',authMiddleware,createReceptionist)

export default router
