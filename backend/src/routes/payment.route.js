import express from 'express';
import * as invoiceController from '../modules/invoices/invoice.controller.js';
import * as invoiceItemController from '../modules/invoice_items/invoice_item.controller.js';
import * as paymentController from '../modules/payments/payment.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';

const router = express.Router();

// Invoice routes
router.post('/invoices/medicine-order', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceController.createMedicineOrder);
router.post('/invoices', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceController.create);
router.get('/invoices', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceController.getAll);

// Invoice Item routes
router.post('/invoices/items', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceItemController.create);
router.get('/invoices/items', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceItemController.getAll);
router.get('/invoices/items/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceItemController.getById);
router.put('/invoices/items/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceItemController.update);
router.delete('/invoices/items/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceItemController.remove);

router.get('/invoices/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceController.getById);
router.put('/invoices/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceController.update);
router.delete('/invoices/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), invoiceController.remove);

// Payment routes
router.post('/order', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.createOrder);
router.post('/verify', authMiddleware, paymentController.verifyAndCapture);
router.post('/capture', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.capturePayment);
router.post('/:id/refund', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.refund);
router.post('/', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.create);
router.get('/', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.getAll);
router.get('/:id', authMiddleware, roleMiddleware(['PATIENT', 'RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.getById);
router.put('/:id', authMiddleware, roleMiddleware(['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.update);
router.delete('/:id', authMiddleware, roleMiddleware(['HOSPITAL_ADMIN', 'SUPER_ADMIN']), paymentController.remove);

export default router;
