import * as prescriptionService from './prescription.service.js';
import { createPrescriptionSchema, updatePrescriptionSchema } from './prescription.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createPrescriptionSchema.parse(req.body);

        // Enforce doctor ownership or clinical role
        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            if (!doctor) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Doctor profile not found.'
                });
            }
            const encounter = await prisma.encounter.findUnique({
                where: { encounterId: validatedData.encounterId },
                select: { doctorId: true }
            });
            if (!encounter) {
                return res.status(404).json({
                    status: 'NOT_FOUND',
                    message: 'Encounter not found.'
                });
            }
            if (encounter.doctorId !== doctor.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only create prescriptions for encounters assigned to you.'
                });
            }
        } else if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            return res.status(403).json({
                status: 'FORBIDDEN',
                message: 'Access denied: Patients cannot create prescriptions.'
            });
        }

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

        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            const existing = await prisma.prescription.findUnique({
                where: { prescriptionId },
                include: { encounter: true }
            });
            if (!existing || existing.encounter?.doctorId !== doctor?.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only update prescriptions for encounters assigned to you.'
                });
            }
        } else if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            return res.status(403).json({
                status: 'FORBIDDEN',
                message: 'Access denied: Patients cannot update prescriptions.'
            });
        }

        const prescription = await prescriptionService.updatePrescription(prescriptionId, validatedData);
        res.status(200).json(prescription);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const prescriptionId = req.params.id;

        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            const existing = await prisma.prescription.findUnique({
                where: { prescriptionId },
                include: { encounter: true }
            });
            if (!existing || existing.encounter?.doctorId !== doctor?.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only delete prescriptions for encounters assigned to you.'
                });
            }
        } else if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            return res.status(403).json({
                status: 'FORBIDDEN',
                message: 'Access denied: Patients cannot delete prescriptions.'
            });
        }

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

        // Enforce doctor ownership
        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            if (!doctor || prescription.encounter?.doctorId !== doctor.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only view prescriptions for your assigned encounters.'
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
        let { encounterId, patientId, doctorId } = req.query;

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

        // If requester is a DOCTOR, strictly scope query to their doctorId
        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            if (!doctor) {
                return res.status(200).json([]);
            }
            doctorId = doctor.doctorId;
        }

        const prescriptions = await prescriptionService.getPrescriptions({
            encounterId,
            patientId,
            doctorId
        });
        res.status(200).json(prescriptions);
    } catch (err) {
        next(err);
    }
};

