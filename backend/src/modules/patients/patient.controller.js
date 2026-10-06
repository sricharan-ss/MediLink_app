import * as patientService from './patient.service.js';
import { createPatientSchema, updatePatientSchema, upsertMyPatientProfileSchema } from './patient.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createPatientSchema.parse(req.body);
        const patient = await patientService.createPatient(validatedData);
        res.status(201).json(patient);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const patientId = req.params.id;
        const validatedData = updatePatientSchema.parse(req.body);
        const patient = await patientService.updatePatient(patientId, validatedData);
        res.status(200).json(patient);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const patientId = req.params.id;
        await patientService.deletePatient(patientId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const patientId = req.params.id;
        const patient = await patientService.getPatientById(patientId);
        res.status(200).json(patient);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { doctorId, encounterId, userId } = req.query;
        const patients = await patientService.getPatients({
            doctorId,
            encounterId,
            userId
        });
        res.status(200).json(patients);
    } catch (err) {
        next(err);
    }
};

export const upsertMyProfile = async (req, res, next) => {
    try {
        const validatedData = upsertMyPatientProfileSchema.parse(req.body);
        const userId = req.userId;
        const patient = await patientService.upsertMyPatientProfile(userId, validatedData);
        res.status(200).json({
            status: 'success',
            message: 'Patient profile saved successfully',
            data: patient,
        });
    } catch (err) {
        next(err);
    }
};
