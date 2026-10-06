import * as labScheduleService from './lab_schedule.service.js';
import {
	createLabScheduleSchema,
	updateLabScheduleSchema,
} from './lab_schedule.validator.js';

export const create = async (req, res, next) => {
	try {
		const validatedData = createLabScheduleSchema.parse(req.body);
		const schedule = await labScheduleService.createLabSchedule(validatedData);
		res.status(201).json(schedule);
	} catch (err) {
		next(err);
	}
};

export const update = async (req, res, next) => {
	try {
		const scheduleId = req.params.id;
		const validatedData = updateLabScheduleSchema.parse(req.body);
		const schedule = await labScheduleService.updateLabSchedule(
			scheduleId,
			validatedData,
			req.userRoles || [],
		);
		res.status(200).json(schedule);
	} catch (err) {
		next(err);
	}
};

export const remove = async (req, res, next) => {
	try {
		const scheduleId = req.params.id;
		await labScheduleService.deleteLabSchedule(scheduleId, req.userRoles || []);
		res.status(204).send();
	} catch (err) {
		next(err);
	}
};

export const getById = async (req, res, next) => {
	try {
		const scheduleId = req.params.id;
		const schedule = await labScheduleService.getLabScheduleById(scheduleId);
		res.status(200).json(schedule);
	} catch (err) {
		next(err);
	}
};

export const getAll = async (req, res, next) => {
	try {
		const {
			labId,
			patientId,
			date,
			slotTime,
			isBooked,
			sourceType,
			sourceRefId,
			externalProviderId,
			syncStatus,
		} = req.query;
		const schedules = await labScheduleService.getLabSchedules({
			labId,
			patientId,
			date: date ? new Date(date) : undefined,
			slotTime,
			isBooked: isBooked === undefined ? undefined : isBooked === 'true',
			sourceType,
			sourceRefId,
			externalProviderId,
			syncStatus,
		});
		res.status(200).json(schedules);
	} catch (err) {
		next(err);
	}
};
