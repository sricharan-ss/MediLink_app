import * as admittedPatientService from './admitted_patient.service.js';
import { createAdmittedPatientSchema, updateAdmittedPatientSchema } from './admitted_patient.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createAdmittedPatientSchema.parse(req.body);
        const admittedPatient = await admittedPatientService.createAdmittedPatient(validatedData);
        res.status(201).json(admittedPatient);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const admittedPatientId = req.params.id;
        const validatedData = updateAdmittedPatientSchema.parse(req.body);
        const admittedPatient = await admittedPatientService.updateAdmittedPatient(admittedPatientId, validatedData);
        res.status(200).json(admittedPatient);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const admittedPatientId = req.params.id;
        await admittedPatientService.deleteAdmittedPatient(admittedPatientId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const admittedPatientId = req.params.id;
        const admittedPatient = await admittedPatientService.getAdmittedPatientById(admittedPatientId);
        res.status(200).json(admittedPatient);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { hospitalId, doctorId, patientId, bedId } = req.query;
        const admittedPatients = await admittedPatientService.getAdmittedPatients({
            hospitalId,
            doctorId,
            patientId,
            bedId
        });
        res.status(200).json(admittedPatients);
    } catch (err) {
        next(err);
    }
};