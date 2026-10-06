import * as labScheduleRepo from './lab_schedule.repo.js';
import * as labRepo from '../labs/lab.repo.js';
import { AppError } from '../../common/errors.js';
import { prisma } from '../../config/db.js';

function normalizeDateOnly(inputDate) {
	const date = new Date(inputDate);
	date.setUTCHours(0, 0, 0, 0);
	return date;
}

function getSlotDateTimeUtc(dateOnly, slotTime) {
	const [hour, minute] = slotTime.split(':').map(Number);
	return new Date(
		Date.UTC(
			dateOnly.getUTCFullYear(),
			dateOnly.getUTCMonth(),
			dateOnly.getUTCDate(),
			hour,
			minute,
			0,
			0,
		),
	);
}

function hasAdminRole(userRoles = []) {
	return userRoles.includes('HOSPITAL_ADMIN') || userRoles.includes('SUPER_ADMIN');
}

function deriveSyncStatusFromSource(data) {
	if (data.syncStatus) {
		return data.syncStatus;
	}

	if (data.sourceType === 'EXTERNAL') {
		return 'PENDING';
	}

	return 'NOT_REQUIRED';
}

function computeLabCountersForBooking(lab, deltaBooked) {
	if (deltaBooked === 0) {
		return null;
	}

	const hasCapacityInfo = lab.capacity !== null && lab.capacity !== undefined;
	const hasExplicitCounters =
		lab.availableSlots !== null &&
		lab.availableSlots !== undefined &&
		lab.bookedSlots !== null &&
		lab.bookedSlots !== undefined;

	if (!hasCapacityInfo && !hasExplicitCounters) {
		return null;
	}

	const currentBooked = lab.bookedSlots ?? 0;
	const inferredAvailableFromCapacity =
		hasCapacityInfo ? Math.max(lab.capacity - currentBooked, 0) : 0;
	const currentAvailable =
		lab.availableSlots !== null && lab.availableSlots !== undefined
			? lab.availableSlots
			: inferredAvailableFromCapacity;

	if (deltaBooked > 0 && currentAvailable < deltaBooked) {
		throw new AppError('No available lab slots left for booking', 409);
	}

	const nextBooked = Math.max(currentBooked + deltaBooked, 0);
	let nextAvailable = currentAvailable - deltaBooked;

	if (hasCapacityInfo) {
		nextAvailable = Math.min(Math.max(nextAvailable, 0), lab.capacity);
	} else {
		nextAvailable = Math.max(nextAvailable, 0);
	}

	return {
		bookedSlots: nextBooked,
		availableSlots: nextAvailable,
	};
}

export async function createLabSchedule(data) {
	const normalizedDate = normalizeDateOnly(data.date);
	const sourceType = data.sourceType || 'MANUAL';
	const lab = await labRepo.getLabById(data.labId);
	if (!lab) {
		throw new AppError('Lab not found', 404);
	}

	if (sourceType !== 'MANUAL' && !data.sourceRefId) {
		throw new AppError('sourceRefId is required for non-manual schedule creation', 400);
	}

	if (sourceType === 'EXTERNAL' && !data.externalProviderId) {
		throw new AppError('externalProviderId is required for EXTERNAL schedules', 400);
	}

	if (sourceType !== 'EXTERNAL' && data.externalProviderId) {
		throw new AppError('externalProviderId is only allowed for EXTERNAL schedules', 400);
	}

	const willBeBooked = data.patientId ? true : (data.isBooked ?? false);

	if (willBeBooked && !data.patientId) {
		throw new AppError('patientId is required when booking a slot', 400);
	}

	const existing = await labScheduleRepo.getLabSchedules({
		labId: data.labId,
		date: normalizedDate,
		slotTime: data.slotTime,
	});

	if (existing && existing.length > 0) {
		throw new AppError('Lab schedule already exists for this slot', 409);
	}

	const slotDateTime = getSlotDateTimeUtc(normalizedDate, data.slotTime);
	if (slotDateTime < new Date()) {
		throw new AppError('Cannot create schedule for a past slot', 400);
	}

	return await prisma.$transaction(async (tx) => {
		const labInTx = await tx.lab.findUnique({ where: { labId: data.labId } });
		if (!labInTx) {
			throw new AppError('Lab not found', 404);
		}

		const counters = computeLabCountersForBooking(labInTx, willBeBooked ? 1 : 0);
		if (counters) {
			await tx.lab.update({
				where: { labId: data.labId },
				data: {
					bookedSlots: counters.bookedSlots,
					availableSlots: counters.availableSlots,
					updatedAt: new Date(),
				},
			});
		}

		return await tx.labSchedule.create({
			data: {
				labId: data.labId,
				patientId: data.patientId ?? null,
				date: normalizedDate,
				slotTime: data.slotTime,
				slotDuration: data.slotDuration,
				isBooked: willBeBooked,
				sourceType: sourceType,
				sourceRefId: data.sourceRefId,
				externalProviderId: data.externalProviderId,
				externalBookingId: data.externalBookingId,
				syncStatus: deriveSyncStatusFromSource({
					sourceType,
					syncStatus: data.syncStatus,
				}),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});
	});
}

export async function updateLabSchedule(scheduleId, data, userRoles = []) {
	const schedule = await labScheduleRepo.getLabScheduleById(scheduleId);
	if (!schedule) {
		throw new AppError('Lab schedule not found', 404);
	}

	const nextDate = data.date ? normalizeDateOnly(data.date) : schedule.date;
	const nextSlotTime = data.slotTime ?? schedule.slotTime;
	const nextSourceType = data.sourceType ?? schedule.sourceType;
	const nextSourceRefId = data.sourceRefId ?? schedule.sourceRefId;
	const nextExternalProviderId =
		data.externalProviderId !== undefined
			? data.externalProviderId
			: schedule.externalProviderId;
	const nextExternalBookingId =
		data.externalBookingId !== undefined
			? data.externalBookingId
			: schedule.externalBookingId;
	const nextSyncStatus = deriveSyncStatusFromSource({
		sourceType: nextSourceType,
		syncStatus: data.syncStatus ?? schedule.syncStatus,
	});
	const nextPatientId =
		data.patientId !== undefined ? data.patientId : schedule.patientId;
	let nextIsBooked =
		data.isBooked !== undefined ? data.isBooked : schedule.isBooked;

	if (nextSourceType !== 'MANUAL' && !nextSourceRefId) {
		throw new AppError('sourceRefId is required for non-manual schedules', 400);
	}

	if (nextSourceType === 'EXTERNAL' && !nextExternalProviderId) {
		throw new AppError('externalProviderId is required for EXTERNAL schedules', 400);
	}

	if (nextSourceType !== 'EXTERNAL' && nextExternalProviderId) {
		throw new AppError('externalProviderId is only allowed for EXTERNAL schedules', 400);
	}

	if (nextIsBooked && !nextPatientId) {
		throw new AppError('patientId is required when setting isBooked=true', 400);
	}

	if (!nextIsBooked && data.patientId !== undefined && data.patientId !== null) {
		throw new AppError('patientId must be null when isBooked=false', 400);
	}

	if (!nextIsBooked) {
		// Strict unbooking rule: patient must be cleared.
		data.patientId = null;
	}

	const slotDateTime = getSlotDateTimeUtc(nextDate, nextSlotTime);
	if (slotDateTime < new Date() && !hasAdminRole(userRoles)) {
		throw new AppError(
			'Only hospital admin/super admin can modify past schedule slots',
			403,
		);
	}

	const slotConflict = await labScheduleRepo.getLabSchedules({
		labId: schedule.labId,
		date: nextDate,
		slotTime: nextSlotTime,
	});
	if (
		slotConflict.some((item) => item.scheduleId !== scheduleId)
	) {
		throw new AppError('Lab schedule already exists for this slot', 409);
	}

	if (data.labId && data.labId !== schedule.labId) {
		throw new AppError('labId cannot be changed for an existing schedule', 400);
	}

	const bookingDelta =
		schedule.isBooked === nextIsBooked
			? 0
			: nextIsBooked
				? 1
				: -1;

	return await prisma.$transaction(async (tx) => {
		if (bookingDelta !== 0) {
			const lab = await tx.lab.findUnique({ where: { labId: schedule.labId } });
			if (!lab) {
				throw new AppError('Lab not found', 404);
			}

			const counters = computeLabCountersForBooking(lab, bookingDelta);
			if (counters) {
				await tx.lab.update({
					where: { labId: schedule.labId },
					data: {
						bookedSlots: counters.bookedSlots,
						availableSlots: counters.availableSlots,
						updatedAt: new Date(),
					},
				});
			}
		}

		return await tx.labSchedule.update({
			where: { scheduleId },
			data: {
				patientId: data.patientId,
				date: data.date ? nextDate : undefined,
				slotTime: data.slotTime,
				slotDuration: data.slotDuration,
				isBooked: data.isBooked,
				sourceType: data.sourceType,
				sourceRefId: data.sourceRefId,
				externalProviderId: data.externalProviderId,
				externalBookingId: nextExternalBookingId,
				syncStatus: nextSyncStatus,
				updatedAt: new Date(),
			},
		});
	});
}

export async function deleteLabSchedule(scheduleId, userRoles = []) {
	const schedule = await labScheduleRepo.getLabScheduleById(scheduleId);
	if (!schedule) {
		throw new AppError('Lab schedule not found', 404);
	}

	const slotDateTime = getSlotDateTimeUtc(schedule.date, schedule.slotTime);
	if (slotDateTime < new Date() && !hasAdminRole(userRoles)) {
		throw new AppError(
			'Only hospital admin/super admin can delete past schedule slots',
			403,
		);
	}


	return await prisma.$transaction(async (tx) => {
		if (schedule.isBooked) {
			const lab = await tx.lab.findUnique({ where: { labId: schedule.labId } });
			if (!lab) {
				throw new AppError('Lab not found', 404);
			}

			const counters = computeLabCountersForBooking(lab, -1);
			if (counters) {
				await tx.lab.update({
					where: { labId: schedule.labId },
					data: {
						bookedSlots: counters.bookedSlots,
						availableSlots: counters.availableSlots,
						updatedAt: new Date(),
					},
				});
			}
		}

		return await tx.labSchedule.delete({
			where: { scheduleId },
		});
	});
}

export async function getLabScheduleById(scheduleId) {
	const schedule = await labScheduleRepo.getLabScheduleById(scheduleId);
	if (!schedule) {
		throw new AppError('Lab schedule not found', 404);
	}
	return schedule;
}

export async function getLabSchedules(filters = {}) {
	const normalizedFilters = { ...filters };
	if (normalizedFilters.date) {
		normalizedFilters.date = normalizeDateOnly(normalizedFilters.date);
	}
	return await labScheduleRepo.getLabSchedules(normalizedFilters);
}
