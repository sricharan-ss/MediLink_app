import * as vitalService from './vital.service.js';
import { createVitalSchema, updateVitalSchema } from './vital.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createVitalSchema.parse(req.body);
        const vital = await vitalService.createVital(validatedData);
        res.status(201).json(vital);
    }
    catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const vitalId = req.params.id;
        const validatedData = updateVitalSchema.parse(req.body);
        const vital = await vitalService.updateVital(vitalId, validatedData);
        res.status(200).json(vital);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const vitalId = req.params.id;
        await vitalService.deleteVital(vitalId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { encounterId, vitalTypeId, deviceId, recordedAt, source, qualityScore } = req.query;
        const vitals = await vitalService.getVitals({
            encounterId,
            vitalTypeId,
            deviceId,
            recordedAt,
            source,
            qualityScore        });
        res.status(200).json(vitals);
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const vitalId = req.params.id;
        const vital = await vitalService.getVitalById(vitalId);
        res.status(200).json(vital);
    } catch (err) {
        next(err);
    }
};