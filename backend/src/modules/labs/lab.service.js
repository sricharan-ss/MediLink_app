import * as labRepo from './lab.repo.js';
import { AppError } from '../../common/errors.js';

export async function createLab(data) {
	if (
		data.capacity !== undefined &&
		data.availableSlots !== undefined &&
		data.availableSlots > data.capacity
	) {
		throw new AppError('availableSlots cannot exceed capacity', 400);
	}

	return await labRepo.createLab(data);
}

export async function updateLab(labId, data) {
	const lab = await labRepo.getLabById(labId);
	if (!lab) {
		throw new AppError('Lab not found', 404);
	}

	const nextCapacity = data.capacity ?? lab.capacity;
	const nextAvailableSlots = data.availableSlots ?? lab.availableSlots;
	if (
		nextCapacity !== null &&
		nextCapacity !== undefined &&
		nextAvailableSlots !== null &&
		nextAvailableSlots !== undefined &&
		nextAvailableSlots > nextCapacity
	) {
		throw new AppError('availableSlots cannot exceed capacity', 400);
	}

	return await labRepo.updateLab(labId, data);
}

export async function deleteLab(labId) {
	const lab = await labRepo.getLabById(labId);
	if (!lab) {
		throw new AppError('Lab not found', 404);
	}
	return await labRepo.deleteLab(labId);
}

export async function getLabById(labId) {
	const lab = await labRepo.getLabById(labId);
	if (!lab) {
		throw new AppError('Lab not found', 404);
	}
	return lab;
}

export async function getLabs(filters = {}) {
	return await labRepo.getLabs(filters);
}
