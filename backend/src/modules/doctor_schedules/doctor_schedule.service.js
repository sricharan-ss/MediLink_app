import * as doctorScheduleRepo from './doctor_schedule.repo.js';
import * as encounterService from '../encounters/encounter.service.js';
import * as notificationRepo from '../notifications/notification.repo.js';
import * as userRepo from '../users/user.repo.js';
import { AppError } from '../../common/errors.js';

export async function createDoctorSchedule(doctorScheduleData) {
    // Check if schedule already exists for this doctor and time
    const existing = await doctorScheduleRepo.getDoctorSchedules({
        doctorId: doctorScheduleData.doctorId,
        scheduledTime: doctorScheduleData.scheduledTime
    });
    
    if (existing && existing.length > 0) {
        throw new AppError('Doctor schedule already exists for this doctor and time slot', 409);
    }

    const encounterId = doctorScheduleData.encounterId;
    if (!encounterId) {
        throw new AppError('encounterId is required. Create encounter first via /api/encounters endpoint', 400);
    }

    const notification = {
        userId: await userRepo.getUserIdByDoctorId(doctorScheduleData.doctorId),
        title: 'Schedule Created',
        message: `New schedule created for doctor ${doctorScheduleData.doctorId} at ${doctorScheduleData.scheduledTime}`,
        type: 'SCHEDULE_CREATED',
        relatedId: encounterId,
        isRead: false
    };
    await notificationRepo.createNotification(notification);

    return await doctorScheduleRepo.createDoctorSchedule({
        ...doctorScheduleData,
        encounterId
    });
}

export async function updateDoctorSchedule(scheduleId, doctorScheduleData) {
    const doctorSchedule = await doctorScheduleRepo.getDoctorScheduleById(scheduleId);
    if (!doctorSchedule) {
        throw new AppError('Doctor schedule not found', 404);
    }

    const updatedSchedule = await doctorScheduleRepo.updateDoctorSchedule(scheduleId, doctorScheduleData);

    if (doctorSchedule.encounterId) {
        try {
            const encounterUpdateData = {
                doctorId: doctorScheduleData.doctorId || undefined,
                patientId: doctorScheduleData.patientId || undefined,
                hospitalId: doctorScheduleData.hospitalId || undefined,
                scheduledTime: doctorScheduleData.scheduledTime || undefined,
                duration: doctorScheduleData.slotDuration || undefined
            };
            // Remove undefined values
            Object.keys(encounterUpdateData).forEach(key => 
                encounterUpdateData[key] === undefined && delete encounterUpdateData[key]
            );
            if (Object.keys(encounterUpdateData).length > 0) {
                const encounterRepo = await import('../encounters/encounter.repo.js');
                await encounterRepo.updateEncounter(doctorSchedule.encounterId, encounterUpdateData);
            }
        } catch (error) {
            throw new AppError('Failed to update encounter: ' + error.message, 400);
        }
    }
    
    const doctorIdForNotification = doctorScheduleData.doctorId || doctorSchedule.doctorId;
    const notification = {
        userId: await userRepo.getUserIdByDoctorId(doctorIdForNotification),
        title: 'Schedule Updated',
        message: `Schedule updated for doctor ${doctorIdForNotification} at ${doctorScheduleData.scheduledTime || doctorSchedule.scheduledTime}`,
        type: 'SCHEDULE_UPDATED',
        relatedId: doctorSchedule.encounterId,
        isRead: false
    };
    await notificationRepo.createNotification(notification);

    return updatedSchedule;
}

export async function deleteDoctorSchedule(scheduleId) {
    const doctorSchedule = await doctorScheduleRepo.getDoctorScheduleById(scheduleId);
    if (!doctorSchedule) {
        throw new AppError('Doctor schedule not found', 404);
    }
    
    if (doctorSchedule.encounterId) {
        try {
            const encounterRepo = await import('../encounters/encounter.repo.js');
            await encounterRepo.deleteEncounter(doctorSchedule.encounterId);
        } catch (error) {
            throw new AppError('Failed to delete encounter: ' + error.message, 400);
        }
    }
    
    const notification = {
        userId: await userRepo.getUserIdByDoctorId(doctorSchedule.doctorId),
        title: 'Schedule Deleted',
        message: `Schedule deleted for doctor ${doctorSchedule.doctorId} at ${doctorSchedule.scheduledTime}`,
        type: 'SCHEDULE_DELETED',
        relatedId: doctorSchedule.encounterId,
        isRead: false
    };
    await notificationRepo.createNotification(notification);

    return await doctorScheduleRepo.deleteDoctorSchedule(scheduleId);
}

export async function getDoctorScheduleById(scheduleId) {
    const doctorSchedule = await doctorScheduleRepo.getDoctorScheduleById(scheduleId);
    if (!doctorSchedule) {
        throw new AppError('Doctor schedule not found', 404);
    }
    return doctorSchedule;
}

export async function getDoctorSchedules(filters = {}) {
    return await doctorScheduleRepo.getDoctorSchedules(filters);
}
