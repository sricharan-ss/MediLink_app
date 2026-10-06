import * as invoiceService from './invoice.service.js';
import { createInvoiceSchema, updateInvoiceSchema } from './invoice.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createInvoiceSchema.parse(req.body);
        const invoice = await invoiceService.createInvoice(validatedData);
        res.status(201).json(invoice);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const invoiceId = req.params.id;
        const validatedData = updateInvoiceSchema.parse(req.body);
        const invoice = await invoiceService.updateInvoice(invoiceId, validatedData);
        res.status(200).json(invoice);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const invoiceId = req.params.id;
        await invoiceService.deleteInvoice(invoiceId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await invoiceService.getInvoiceById(invoiceId);

        // Enforce patient ownership
        if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['RECEPTIONIST', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            const { prisma } = await import('../../config/db.js');
            const patient = await prisma.patient.findUnique({
                where: { userId: req.userId },
                select: { patientId: true }
            });
            if (!patient || invoice.patientId !== patient.patientId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only view your own invoices.'
                });
            }
        }

        res.status(200).json(invoice);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        let { patientId, hospitalId, status, dueDate } = req.query;

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

        const invoices = await invoiceService.getInvoices({
            patientId,
            hospitalId,
            status,
            dueDate
        });
        res.status(200).json(invoices);
    } catch (err) {
        next(err);
    }
};

export const createMedicineOrder = async (req, res, next) => {
    try {
        const { prisma } = await import('../../config/db.js');
        const patient = await prisma.patient.findUnique({
            where: { userId: req.userId },
            select: { patientId: true }
        });

        if (!patient) {
            return res.status(400).json({
                status: 'BAD_REQUEST',
                message: 'Patient profile not found. Please complete profile setup before placing orders.'
            });
        }

        const { hospitalId, deliveryAddress, notes, items } = req.body;
        const invoice = await invoiceService.createMedicineInvoiceService({
            patientId: patient.patientId,
            hospitalId,
            deliveryAddress,
            notes,
            items
        });

        res.status(201).json({
            status: 'CREATED',
            data: invoice
        });
    } catch (err) {
        next(err);
    }
};

