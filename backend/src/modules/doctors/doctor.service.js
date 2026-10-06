import * as doctorRepository from './doctor.repo.js';
import { AppError } from '../../common/errors.js';

export async function createDoctor(data) {
    const doctors = await doctorRepository.getDoctors({ userId: data.userId });
    if (doctors && doctors.length > 0) {
        throw new AppError('Doctor already exists for this user', 409);
    }
    return await doctorRepository.createDoctor(data);
}

export async function updateDoctor(doctorId, data) {
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if (!doctor) {
        throw new AppError('Doctor not found', 404);
    }
    if (data.userId && doctor.userId !== data.userId) {
        throw new AppError('Unauthorized to update this doctor', 403);
    }
    return await doctorRepository.updateDoctor(doctorId, data);
}

export async function deleteDoctor(doctorId){
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if (!doctor) {
        throw new AppError('Doctor not found', 404);
    }
    return await doctorRepository.deleteDoctor(doctorId);
}

export async function getDoctorById(doctorId) {
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if(!doctor) {
        throw new AppError('Doctor not found', 404);
    }
    return doctor;
}

export async function getDoctors(filters = {}) {
    const doctors = await doctorRepository.getDoctors(filters);
    if (!doctors || doctors.length === 0) {
        throw new AppError('No doctors found for the given filters', 404);
    }
    return doctors;
}

export async function getDoctorAvailableSlots(doctorId, { date, hospitalId }) {
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if (!doctor) {
        throw new AppError('Doctor not found', 404);
    }

    const dateStr = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    const dayOfWeek = dayStart.getUTCDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseSlots = isWeekend
        ? ['10:00', '10:30', '11:00', '11:30', '12:00']
        : [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
        ];

    const { prisma } = await import('../../config/db.js');
    const existingEncounters = await prisma.encounter.findMany({
        where: {
            doctorId,
            scheduledTime: {
                gte: dayStart,
                lte: dayEnd,
            },
            status: {
                notIn: ['CANCELLED', 'NO_SHOW'],
            },
        },
        select: {
            scheduledTime: true,
        },
    });

    const existingSchedules = await prisma.doctorSchedule.findMany({
        where: {
            doctorId,
            scheduledTime: {
                gte: dayStart,
                lte: dayEnd,
            },
            isBooked: true,
        },
        select: {
            scheduledTime: true,
        },
    });

    const bookedTimes = new Set();
    for (const enc of existingEncounters) {
        const d = new Date(enc.scheduledTime);
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        bookedTimes.add(`${hours}:${minutes}`);
    }
    for (const sch of existingSchedules) {
        const d = new Date(sch.scheduledTime);
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        bookedTimes.add(`${hours}:${minutes}`);
    }

    return baseSlots.map((time) => ({
        time,
        available: !bookedTimes.has(time),
        slotTime: time,
        isAvailable: !bookedTimes.has(time),
    }));
}
