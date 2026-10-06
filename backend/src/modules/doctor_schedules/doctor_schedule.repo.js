import { prisma } from '../../config/db.js';

export async function createDoctorSchedule(data) {
    const scheduledDate = new Date(data.scheduledTime);
    const existing = await prisma.doctorSchedule.findFirst({
        where: {
            doctorId: data.doctorId,
            scheduledTime: scheduledDate,
        }
    });

    if (existing) {
        return await prisma.doctorSchedule.update({
            where: { scheduleId: existing.scheduleId },
            data: {
                patientId: data.patientId,
                hospitalId: data.hospitalId,
                encounterId: data.encounterId,
                slotDuration: data.slotDuration,
                isBooked: data.isBooked || false,
                updatedAt: new Date()
            }
        });
    }

    return await prisma.doctorSchedule.create({
        data: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            hospitalId: data.hospitalId,
            encounterId: data.encounterId,
            scheduledTime: scheduledDate,
            slotDuration: data.slotDuration,
            isBooked: data.isBooked || false,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
}

export async function updateDoctorSchedule(scheduleId, data) {
    return await prisma.doctorSchedule.update({
        where: { scheduleId: scheduleId },
        data: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            hospitalId: data.hospitalId,
            scheduledTime: data.scheduledTime,
            slotDuration: data.slotDuration,
            isBooked: data.isBooked,
            updatedAt: new Date()
        }
    })
}

export async function deleteDoctorSchedule(scheduleId) {
    return await prisma.doctorSchedule.delete({
        where: { scheduleId: scheduleId }
    })
}

export async function getDoctorScheduleById(scheduleId) {
    return await prisma.doctorSchedule.findUnique({
        where: { scheduleId: scheduleId }
    })
}

export async function getDoctorSchedules(filters = {}) {
    const where = {};

    if (filters.doctorId) {
        where.doctorId = filters.doctorId;
    }

    if (filters.patientId) {
        where.patientId = filters.patientId;
    }

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    if (filters.encounterId) {
        where.encounterId = filters.encounterId;
    }

    if (filters.scheduledTime) {
        where.scheduledTime = new Date(filters.scheduledTime);
    }
    
    return await prisma.doctorSchedule.findMany({ where });
}