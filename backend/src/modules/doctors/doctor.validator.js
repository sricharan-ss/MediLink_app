import { z } from 'zod';

export const createDoctorSchema = z.object({
    userId: z.string(),
    specialization: z.enum(['CARDIOLOGY','NEUROLOGY','ORTHOPEDICS','GENERAL_SURGERY','DERMATOLOGY','PSYCHIATRY','PEDIATRICS','GYNECOLOGY','ENT','OPHTHALMOLOGY','GENERAL_PRACTICE']).optional(),
    licenseNo: z.string().optional(),
    signatureurl: z.string().optional(),
    isAvailable: z.boolean(),
    avgRating: z.number().optional(),
    joiningDate: z.coerce.date().optional()
})

export const updateDoctorSchema = z.object({
    specialization: z.enum(['CARDIOLOGY','NEUROLOGY','ORTHOPEDICS','GENERAL_SURGERY','DERMATOLOGY','PSYCHIATRY','PEDIATRICS','GYNECOLOGY','ENT','OPHTHALMOLOGY','GENERAL_PRACTICE']).optional(),
    licenseNo: z.string().optional(),
    signatureurl: z.string().optional(),
    isAvailable: z.boolean().optional(),
    avgRating: z.number().optional(),
    joiningDate: z.coerce.date().optional()
})
