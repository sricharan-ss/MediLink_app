import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createNurse } from '../modules/nurses/nurse.controller.js';
const router = express.Router();

router.post('/create', authMiddleware, createNurse);

export default router;
