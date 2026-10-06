import * as doctorHospitalService from './doctor_hospital.service.js';
import { createDoctorHospitalSchema, updateDoctorHospitalSchema } from './doctor_hospital.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createDoctorHospitalSchema.parse(req.body);
        const doctorHospital = await doctorHospitalService.createDoctorHospital(validatedData);
        res.status(201).json(doctorHospital);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const doctorHospitalId = req.params.id;
        const validatedData = updateDoctorHospitalSchema.parse(req.body);
        const doctorHospital = await doctorHospitalService.updateDoctorHospital(doctorHospitalId, validatedData);
        res.status(200).json(doctorHospital);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const doctorHospitalId = req.params.id;
        await doctorHospitalService.deleteDoctorHospital(doctorHospitalId);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const doctorHospitalId = req.params.id;
        const doctorHospital = await doctorHospitalService.getDoctorHospitalById(doctorHospitalId);
        res.status(200).json(doctorHospital);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { doctorId, hospitalId } = req.query;
        const doctorHospitals = await doctorHospitalService.getDoctorHospitals({
            doctorId,
            hospitalId
        });
        res.status(200).json(doctorHospitals);
    }
    catch (err) {
        next(err);
    }
};

