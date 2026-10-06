import * as encounterService from './encounter.service.js';
import { createEncounterSchema, updateEncounterSchema } from './encounter.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createEncounterSchema.parse(req.body);
        const encounter = await encounterService.createEncounter(validatedData);
        res.status(201).json(encounter);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const encounterId = req.params.id;
        const validatedData = updateEncounterSchema.parse(req.body);
        const encounter = await encounterService.updateEncounter(encounterId, validatedData);
        res.status(200).json(encounter);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const encounterId = req.params.id;
        await encounterService.deleteEncounter(encounterId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const encounterId = req.params.id;
        const encounter = await encounterService.getEncounterById(encounterId);
        res.status(200).json(encounter);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { patientId, doctorId, hospitalId, status, visitType } = req.query;
        const encounters = await encounterService.getEncounters({
            patientId,
            doctorId,
            hospitalId,
            status,
            visitType
        });
        res.status(200).json(encounters);
    } catch (err) {
        next(err);
    }
};