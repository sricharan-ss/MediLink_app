import { z } from 'zod';

export const createPrescriptionSchema = z.object({
    encounterId: z.string().uuid(),
    nextVisit: z.coerce.date().optional(),
    generatedAt: z.coerce.date().optional(),
    diagnosisText: z.string().optional(),
    symptoms: z.string().optional(),
    allergiesNoted: z.string().optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
    medicines: z.array(z.object({
        medicineId: z.string().uuid(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        durationDays: z.number().int().positive().optional()
    })).optional()
});

export const updatePrescriptionSchema = z.object({
    nextVisit: z.coerce.date().optional(),
    generatedAt: z.coerce.date().optional(),
    diagnosisText: z.string().optional(),
    symptoms: z.string().optional(),
    allergiesNoted: z.string().optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
    medicines: z.array(z.object({
        medicineId: z.string().uuid(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        durationDays: z.number().int().positive().optional()
    })).optional()
});