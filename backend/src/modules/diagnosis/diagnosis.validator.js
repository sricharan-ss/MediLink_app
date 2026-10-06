import { z } from 'zod';

export const createDiagnosisSchema = z.object({
    encounterId: z.string().uuid(),
    icdCode: z.string().optional(),
    diagnosisText: z.string().optional(),
    symptoms: z.union([z.array(z.string()), z.string()]).optional(),
    allergiesNoted: z.union([z.array(z.string()), z.string()]).optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE','CRITICAL']).optional(),
    diagnosedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const updateDiagnosisSchema = z.object({
    icdCode: z.string().optional(),
    diagnosisText: z.string().optional(),
    symptoms: z.union([z.array(z.string()), z.string()]).optional(),
    allergiesNoted: z.union([z.array(z.string()), z.string()]).optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE','CRITICAL']).optional(),
    updatedAt: z.coerce.date().optional()
});