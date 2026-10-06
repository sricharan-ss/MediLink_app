import * as doctorScheduleService from './doctor_schedule.service.js';
import { createDoctorScheduleSchema, updateDoctorScheduleSchema } from './doctor_schedule.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createDoctorScheduleSchema.parse(req.body);
        const doctorSchedule = await doctorScheduleService.createDoctorSchedule(validatedData);
        res.status(201).json(doctorSchedule);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const scheduleId = req.params.id;
        const validatedData = updateDoctorScheduleSchema.parse(req.body);
        const doctorSchedule = await doctorScheduleService.updateDoctorSchedule(scheduleId, validatedData);
        res.status(200).json(doctorSchedule);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const scheduleId = req.params.id;
        await doctorScheduleService.deleteDoctorSchedule(scheduleId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const scheduleId = req.params.id;
        const doctorSchedule = await doctorScheduleService.getDoctorScheduleById(scheduleId);
        res.status(200).json(doctorSchedule);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { doctorId, patientId, hospitalId, encounterId, scheduledTime } = req.query;
        const doctorSchedules = await doctorScheduleService.getDoctorSchedules({
            doctorId,
            patientId,
            hospitalId,
            encounterId,
            scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
        });
        res.status(200).json(doctorSchedules);
    } catch (err) {
        next(err);
    }
};