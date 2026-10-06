import { z } from 'zod';

export const createVitalTypeSchema = z.object({
    name: z.string(),
    unit: z.string().optional(),
    normalRange: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
})

export const updateVitalTypeSchema = z.object({
    name: z.string().optional(),
    unit: z.string().optional(),
    normalRange: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
})