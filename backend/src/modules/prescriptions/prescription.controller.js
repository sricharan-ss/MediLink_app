import * as prescriptionService from './prescription.service.js';
import { createPrescriptionSchema, updatePrescriptionSchema } from './prescription.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createPrescriptionSchema.parse(req.body);
        const prescription = await prescriptionService.createPrescription(validatedData);
        res.status(201).json(prescription);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const prescriptionId = req.params.id;
        const validatedData = updatePrescriptionSchema.parse(req.body);
        const prescription = await prescriptionService.updatePrescription(prescriptionId, validatedData);
        res.status(200).json(prescription);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const prescriptionId = req.params.id;
        await prescriptionService.deletePrescription(prescriptionId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const prescriptionId = req.params.id;
        const prescription = await prescriptionService.getPrescriptionById(prescriptionId);

        // Enforce patient ownership
        if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            const { prisma } = await import('../../config/db.js');
            const patient = await prisma.patient.findUnique({
                where: { userId: req.userId },
                select: { patientId: true }
            });
            if (!patient || prescription.encounter?.patientId !== patient.patientId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only view your own prescriptions.'
                });
            }
        }

        res.status(200).json(prescription);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        let { encounterId, patientId } = req.query;

        // If requester is a PATIENT, strictly scope query to their patientId
        if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
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

        const prescriptions = await prescriptionService.getPrescriptions({
            encounterId,
            patientId
        });
        res.status(200).json(prescriptions);
    } catch (err) {
        next(err);
    }
};

