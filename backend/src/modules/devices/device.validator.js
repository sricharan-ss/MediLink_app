import { z } from 'zod';

export const createDeviceSchema = z.object({
    name: z.string(),
    deviceType: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    calibrationDate: z.coerce.date(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});

export const updateDeviceSchema = z.object({
    name: z.string(),
    deviceType: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    calibrationDate: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
});