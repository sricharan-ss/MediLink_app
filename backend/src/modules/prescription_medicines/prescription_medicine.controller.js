import * as prescriptionMedicineService from './prescription_medicine.service.js';
import { createPrescriptionMedicineSchema, updatePrescriptionMedicineSchema } from './prescription_medicine.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createPrescriptionMedicineSchema.parse(req.body);

        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            const pres = await prisma.prescription.findUnique({
                where: { prescriptionId: validatedData.prescriptionId },
                include: { encounter: true }
            });
            if (!pres || pres.encounter?.doctorId !== doctor?.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only add medicines to prescriptions for your assigned encounters.'
                });
            }
        } else if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            return res.status(403).json({
                status: 'FORBIDDEN',
                message: 'Access denied: Patients cannot add prescription medicines.'
            });
        }

        const prescriptionMedicine = await prescriptionMedicineService.createPrescriptionMedicine(validatedData);
        res.status(201).json(prescriptionMedicine);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const prescriptionMedicineId = req.params.id;
        const validatedData = updatePrescriptionMedicineSchema.parse(req.body);

        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            const pm = await prisma.prescriptionMedicine.findUnique({
                where: { prescriptionMedicineId },
                include: { prescription: { include: { encounter: true } } }
            });
            if (!pm || pm.prescription?.encounter?.doctorId !== doctor?.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only update medicines on prescriptions for your assigned encounters.'
                });
            }
        } else if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            return res.status(403).json({
                status: 'FORBIDDEN',
                message: 'Access denied: Patients cannot update prescription medicines.'
            });
        }

        const prescriptionMedicine = await prescriptionMedicineService.updatePrescriptionMedicine(prescriptionMedicineId, validatedData);
        res.status(200).json(prescriptionMedicine);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const prescriptionMedicineId = req.params.id;

        if (req.userRoles && req.userRoles.includes('DOCTOR') && !req.userRoles.includes('SUPER_ADMIN')) {
            const { prisma } = await import('../../config/db.js');
            const doctor = await prisma.doctor.findUnique({
                where: { userId: req.userId },
                select: { doctorId: true }
            });
            const pm = await prisma.prescriptionMedicine.findUnique({
                where: { prescriptionMedicineId },
                include: { prescription: { include: { encounter: true } } }
            });
            if (!pm || pm.prescription?.encounter?.doctorId !== doctor?.doctorId) {
                return res.status(403).json({
                    status: 'FORBIDDEN',
                    message: 'Access denied: You can only delete medicines on prescriptions for your assigned encounters.'
                });
            }
        } else if (req.userRoles && req.userRoles.includes('PATIENT') && !req.userRoles.some(r => ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(r))) {
            return res.status(403).json({
                status: 'FORBIDDEN',
                message: 'Access denied: Patients cannot delete prescription medicines.'
            });
        }

        await prescriptionMedicineService.deletePrescriptionMedicine(prescriptionMedicineId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const prescriptionMedicineId = req.params.id;
        const prescriptionMedicine = await prescriptionMedicineService.getPrescriptionMedicineById(prescriptionMedicineId);
        res.status(200).json(prescriptionMedicine);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { prescriptionId: prescriptionIdParam } = req.params;
        const { medicineId } = req.query;
        const prescriptionMedicines = await prescriptionMedicineService.getPrescriptionMedicines({
            prescriptionId: prescriptionIdParam,
            medicineId
        });
        res.status(200).json(prescriptionMedicines);
    } catch (err) {
        next(err);
    }
};