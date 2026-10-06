import * as labService from './lab.service.js';
import { createLabSchema, updateLabSchema } from './lab.validator.js';

export const create = async (req, res, next) => {
	try {
		const validatedData = createLabSchema.parse(req.body);
		const lab = await labService.createLab(validatedData);
		res.status(201).json(lab);
	} catch (err) {
		next(err);
	}
};

export const update = async (req, res, next) => {
	try {
		const labId = req.params.id;
		const validatedData = updateLabSchema.parse(req.body);
		const lab = await labService.updateLab(labId, validatedData);
		res.status(200).json(lab);
	} catch (err) {
		next(err);
	}
};

export const remove = async (req, res, next) => {
	try {
		const labId = req.params.id;
		await labService.deleteLab(labId);
		res.status(204).send();
	} catch (err) {
		next(err);
	}
};

export const getById = async (req, res, next) => {
	try {
		const labId = req.params.id;
		const lab = await labService.getLabById(labId);
		res.status(200).json(lab);
	} catch (err) {
		next(err);
	}
};

export const getAll = async (req, res, next) => {
	try {
		const { hospitalId, labManagerId, name } = req.query;
		const labs = await labService.getLabs({ hospitalId, labManagerId, name });
		res.status(200).json(labs);
	} catch (err) {
		next(err);
	}
};
