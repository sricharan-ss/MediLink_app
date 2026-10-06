import { z } from 'zod';

export const createPatientSchema = z.object({
    userId: z.string(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dob: z.coerce.date().optional(),
    bloodGroup: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']).optional(),
    favouriteDoctorIds: z.array(z.string()).optional()
});

export const updatePatientSchema = z.object({
    gender: z.enum(['male', 'female', 'other']).optional(),
    dob: z.coerce.date().optional(),
    bloodGroup: z.enum(['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']).optional(),
    favouriteDoctorIds: z.array(z.string()).optional(),
    chronicConditions: z.array(z.string().min(1)).optional()
});

export const upsertMyPatientProfileSchema = z.object({
    age: z.coerce.number().int().min(0).max(130),
    gender: z.enum(['male', 'female', 'other']),
    bloodGroup: z.enum([
        'A_POSITIVE',
        'A_NEGATIVE',
        'B_POSITIVE',
        'B_NEGATIVE',
        'AB_POSITIVE',
        'AB_NEGATIVE',
        'O_POSITIVE',
        'O_NEGATIVE'
    ]).optional(),
    chronicConditions: z.array(z.string().min(1)).optional(),
});
