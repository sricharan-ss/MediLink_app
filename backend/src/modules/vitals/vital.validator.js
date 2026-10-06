import { z } from 'zod';

export const createVitalSchema = z.object({
    encounterId: z.string().uuid(),
    vitalTypeId: z.string().uuid(),
    deviceId: z.string().uuid().optional(),
    value: z.string(),
    recordedAt: z.coerce.date().optional(),
    source: z.enum(['MANUAL', 'DEVICE', 'PATIENT_REPORTED']).optional(),
    qualityScore: z.number().min(0).max(100).optional()
});

export const updateVitalSchema = z.object({
    encounterId: z.string().uuid(),
    vitalTypeId: z.string().uuid(),
    deviceId: z.string().uuid().optional(),
    value: z.string(),
    recordedAt: z.coerce.date().optional(),
    source: z.enum(['MANUAL', 'DEVICE', 'PATIENT_REPORTED']).optional(),
    qualityScore: z.number().min(0).max(100).optional()
});

