import * as medicineService from './medicine.service.js';
import { createMedicineSchema, updateMedicineSchema } from './medicine.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createMedicineSchema.parse(req.body);
        const medicine = await medicineService.createMedicine(validatedData);
        res.status(201).json({
            status: 'CREATED',
            data: medicine
        });
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const medicineId = req.params.id;
        const validatedData = updateMedicineSchema.parse(req.body);
        const medicine = await medicineService.updateMedicine(medicineId, validatedData);
        res.status(200).json({
            status: 'OK',
            data: medicine
        });
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const medicineId = req.params.id;
        await medicineService.deleteMedicine(medicineId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const medicineId = req.params.id;
        const medicine = await medicineService.getMedicineById(medicineId);
        res.status(200).json({
            status: 'OK',
            data: medicine
        });
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { name, type, manufacturer, isDiscontinued, search, q, limit } = req.query;
        const medicines = await medicineService.getMedicines({ 
            name, 
            type, 
            manufacturer,
            isDiscontinued,
            search: search || q,
            limit
        });
        res.status(200).json({
            status: 'OK',
            data: medicines,
            count: medicines.length,
        });
    } catch (err) {
        next(err);
    }
};


