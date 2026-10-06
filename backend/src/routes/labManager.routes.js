import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createLabManager } from '../modules/lab_manager/labManager.controller.js';
import {
	getLabTests,
	createLabTest,
} from '../modules/lab_tests/lab_tests.controller.js';
import {
	getLabResults,
	createLabResult,
} from '../modules/lab_results/lab_results.controller.js';
const router = express.Router();

router.post('/create', authMiddleware, createLabManager);

// Lab manager operational routes
router.get('/lab-tests', authMiddleware, getLabTests);
router.post('/lab-tests', authMiddleware, createLabTest);
router.get('/lab-results', authMiddleware, getLabResults);
router.post('/lab-results', authMiddleware, createLabResult);

export default router;
