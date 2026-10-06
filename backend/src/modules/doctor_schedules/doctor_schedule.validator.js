import { z } from 'zod';

export const createDoctorScheduleSchema = z.object({
    doctorId: z.string().uuid(),
    patientId: z.string().uuid(),
    hospitalId: z.string().uuid(),
    encounterId: z.string().uuid(),
    scheduledTime: z.coerce.date(),
    slotDuration: z.number().int().positive(),
    isBooked: z.boolean().optional()
});

export const updateDoctorScheduleSchema = z.object({
    patientId: z.string().uuid().optional(),
    hospitalId: z.string().uuid().optional(),
    encounterId: z.string().uuid().optional(),
    scheduledTime: z.coerce.date().optional(),
    slotDuration: z.number().int().positive().optional(),
    isBooked: z.boolean().optional()
});