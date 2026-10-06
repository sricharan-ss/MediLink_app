import * as paymentService from './payment.service.js';
import { createPaymentSchema, updatePaymentSchema } from './payment.validator.js';

// Create Razorpay order for an invoice
export const createOrder = async (req, res, next) => {
    try {
        const { invoiceId, amount, currency, notes } = req.body;
        const result = await paymentService.createRazorpayOrder(invoiceId, amount, currency, notes);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// Verify and capture payment after user completes payment on frontend
export const verifyAndCapture = async (req, res, next) => {
    try {
        const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
        const payment = await paymentService.verifyAndCapturePayment(
            paymentId, 
            razorpayPaymentId, 
            razorpayOrderId, 
            razorpaySignature
        );
        res.status(200).json(payment);
    } catch (err) {
        next(err);
    }
};

// Capture payment manually (if needed)
export const capturePayment = async (req, res, next) => {
    try {
        const { razorpayPaymentId, amount, currency } = req.body;
        const result = await paymentService.capturePayment(razorpayPaymentId, amount, currency);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// Refund payment
export const refund = async (req, res, next) => {
    try {
        const paymentId = req.params.id;
        const { amount, notes } = req.body;
        const refund = await paymentService.refundPayment(paymentId, amount, notes);
        res.status(200).json(refund);
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        const validatedData = createPaymentSchema.parse(req.body);
        const payment = await paymentService.createPayment(validatedData);
        res.status(201).json(payment);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const paymentId = req.params.id;
        const validatedData = updatePaymentSchema.parse(req.body);
        const payment = await paymentService.updatePayment(paymentId, validatedData);
        res.status(200).json(payment);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const paymentId = req.params.id;
        await paymentService.deletePayment(paymentId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const paymentId = req.params.id;
        const payment = await paymentService.getPaymentById(paymentId);

        // Enforce patient ownership
        if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            const { prisma } = await import('../../config/db.js');
            const patient = await prisma.patient.findUnique({
                where: { userId: req.userId },
                select: { patientId: true }
            });
            const invoice = payment.invoiceId ? await prisma.invoice.findUnique({ where: { invoiceId: payment.invoiceId } }) : null;
            if (!patient || (invoice && invoice.patientId !== patient.patientId)) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only view your own payments.'
                });
            }
        }

        res.status(200).json(payment);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        let { invoiceId, status, patientId } = req.query;

        // If requester is a PATIENT, strictly scope query to their patientId
        if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            const { prisma } = await import('../../config/db.js');
            const patient = await prisma.patient.findUnique({
                where: { userId: req.userId },
                select: { patientId: true }
            });
            if (!patient) {
                return res.status(200).json([]);
            }
            patientId = patient.patientId;
        }

        const payments = await paymentService.getPayments({ invoiceId, status, patientId });
        res.status(200).json(payments);
    }
    catch (err) {
        next(err);
    }
};
