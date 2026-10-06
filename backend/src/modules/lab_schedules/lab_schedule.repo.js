import { prisma } from '../../config/db.js';

export async function createLabSchedule(data) {
	return await prisma.labSchedule.create({
		data: {
			labId: data.labId,
			patientId: data.patientId,
			date: data.date,
			slotTime: data.slotTime,
			slotDuration: data.slotDuration,
			isBooked: data.isBooked ?? false,
			sourceType: data.sourceType,
			sourceRefId: data.sourceRefId,
			externalProviderId: data.externalProviderId,
			externalBookingId: data.externalBookingId,
			syncStatus: data.syncStatus,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
}

export async function updateLabSchedule(scheduleId, data) {
	return await prisma.labSchedule.update({
		where: { scheduleId },
		data: {
			patientId: data.patientId,
			date: data.date,
			slotTime: data.slotTime,
			slotDuration: data.slotDuration,
			isBooked: data.isBooked,
			sourceType: data.sourceType,
			sourceRefId: data.sourceRefId,
			externalProviderId: data.externalProviderId,
			externalBookingId: data.externalBookingId,
			syncStatus: data.syncStatus,
			updatedAt: new Date(),
		},
	});
}

export async function deleteLabSchedule(scheduleId) {
	return await prisma.labSchedule.delete({
		where: { scheduleId },
	});
}

export async function getLabScheduleById(scheduleId) {
	return await prisma.labSchedule.findUnique({
		where: { scheduleId },
	});
}

export async function getLabSchedules(filters = {}) {
	const where = {};

	if (filters.labId) {
		where.labId = filters.labId;
	}

	if (filters.patientId) {
		where.patientId = filters.patientId;
	}

	if (filters.date) {
		where.date = filters.date;
	}

	if (filters.slotTime) {
		where.slotTime = filters.slotTime;
	}

	if (filters.isBooked !== undefined) {
		where.isBooked = filters.isBooked;
	}

	if (filters.sourceType) {
		where.sourceType = filters.sourceType;
	}

	if (filters.sourceRefId) {
		where.sourceRefId = filters.sourceRefId;
	}

	if (filters.externalProviderId) {
		where.externalProviderId = filters.externalProviderId;
	}

	if (filters.syncStatus) {
		where.syncStatus = filters.syncStatus;
	}

	return await prisma.labSchedule.findMany({ where });
}
