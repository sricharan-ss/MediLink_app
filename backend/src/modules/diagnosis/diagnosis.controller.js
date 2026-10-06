import * as diagnosisService from './diagnosis.service.js';
import { createDiagnosisSchema, updateDiagnosisSchema } from './diagnosis.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createDiagnosisSchema.parse(req.body);
        const diagnosis = await diagnosisService.createDiagnosis(validatedData);
        res.status(201).json(diagnosis);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const diagnosisId = req.params.id;
        const validatedData = updateDiagnosisSchema.parse(req.body);
        const diagnosis = await diagnosisService.updateDiagnosis(diagnosisId, validatedData);
        res.status(200).json(diagnosis);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const diagnosisId = req.params.id;
        await diagnosisService.deleteDiagnosis(diagnosisId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const diagnosisId = req.params.id;
        const diagnosis = await diagnosisService.getDiagnosisById(diagnosisId);
        res.status(200).json(diagnosis);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { encounterId, icdCode, severity } = req.query;
        const diagnoses = await diagnosisService.getDiagnoses({
            encounterId,
            icdCode,
            severity
        });
        res.status(200).json(diagnoses);
    } catch (err) {
        next(err);
    }
};