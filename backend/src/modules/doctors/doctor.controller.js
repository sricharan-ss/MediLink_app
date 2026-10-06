import * as doctorService from './doctor.service.js';
import { createDoctorSchema, updateDoctorSchema } from './doctor.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createDoctorSchema.parse(req.body);
        const doctor = await doctorService.createDoctor(validatedData);
        res.status(201).json(doctor);
    } catch(err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const doctorId = req.params.id;
        const validatedData = updateDoctorSchema.parse(req.body);
        const doctor = await doctorService.updateDoctor(doctorId, validatedData);
        res.status(200).json(doctor);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const doctorId = req.params.id;
        await doctorService.deleteDoctor(doctorId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const doctorId = req.params.id;
        const doctor = await doctorService.getDoctorById(doctorId);
        res.status(200).json(doctor);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { hospitalId, specialization, isAvailable, userId, encounterId } = req.query;
        const doctors = await doctorService.getDoctors({
            hospitalId,
            specialization,
            isAvailable: isAvailable === undefined ? undefined : isAvailable === 'true',
            userId,
            encounterId
        });
        res.status(200).json(doctors);
    } catch (err) {
        next(err);
    }
};
