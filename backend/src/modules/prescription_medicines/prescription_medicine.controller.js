import * as prescriptionMedicineService from './prescription_medicine.service.js';
import { createPrescriptionMedicineSchema, updatePrescriptionMedicineSchema } from './prescription_medicine.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createPrescriptionMedicineSchema.parse(req.body);
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
        const prescriptionMedicine = await prescriptionMedicineService.updatePrescriptionMedicine(prescriptionMedicineId, validatedData);
        res.status(200).json(prescriptionMedicine);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const prescriptionMedicineId = req.params.id;
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