import * as vitalTypeService from './vital_type.service.js';
import { createVitalTypeSchema, updateVitalTypeSchema } from './vital_type.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createVitalTypeSchema.parse(req.body);
        const vitalType = await vitalTypeService.create(validatedData);
        res.status(201).json(vitalType);
    }
    catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const vitalTypeId = req.params.id;
        const validatedData = updateVitalTypeSchema.parse(req.body);
        const vitalType = await vitalTypeService.update(vitalTypeId, validatedData);
        res.status(200).json(vitalType);
    }
    catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const vitalTypeId = req.params.id;
        await vitalTypeService.remove(vitalTypeId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const vitalTypeId = req.params.id;
        const vitalType = await vitalTypeService.getById(vitalTypeId);
        res.status(200).json(vitalType);
    }
    catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {

    try {
        const { name } = req.query;
        const vitalTypes = await vitalTypeService.getAll({ name });
        res.status(200).json(vitalTypes);
    }   catch (err) {
        next(err);
    }
};