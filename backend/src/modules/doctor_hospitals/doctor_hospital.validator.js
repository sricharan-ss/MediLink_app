import { z } from 'zod';

export const createDoctorHospitalSchema = z.object({
    doctorId: z.string(),
    hospitalId: z.string(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
});

export const updateDoctorHospitalSchema = z.object({
    doctorId: z.string().optional(),
    hospitalId: z.string().optional(),
    updatedAt: z.date().optional()
});