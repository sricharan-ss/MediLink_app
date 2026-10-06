import { prisma } from '../../config/db.js';

export async function createLab(data) {
	return await prisma.lab.create({
		data: {
			hospitalId: data.hospitalId,
			name: data.name,
			capacity: data.capacity,
			labManagerId: data.labManagerId,
			availableSlots: data.availableSlots,
			bookedSlots: data.bookedSlots,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
}

export async function updateLab(labId, data) {
	return await prisma.lab.update({
		where: { labId },
		data: {
			name: data.name,
			capacity: data.capacity,
			labManagerId: data.labManagerId,
			availableSlots: data.availableSlots,
			bookedSlots: data.bookedSlots,
			updatedAt: new Date(),
		},
	});
}

export async function deleteLab(labId) {
	return await prisma.lab.delete({
		where: { labId },
	});
}

export async function getLabById(labId) {
	return await prisma.lab.findUnique({
		where: { labId },
	});
}

export async function getLabs(filters = {}) {
	const where = {};

	if (filters.hospitalId) {
		where.hospitalId = filters.hospitalId;
	}

	if (filters.labManagerId) {
		where.labManagerId = filters.labManagerId;
	}

	if (filters.name) {
		where.name = {
			contains: filters.name,
			mode: 'insensitive',
		};
	}

	return await prisma.lab.findMany({ where });
}
