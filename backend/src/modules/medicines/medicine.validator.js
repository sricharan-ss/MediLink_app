import { z } from 'zod';

export const createMedicineSchema = z.object({
    csvId: z.string().optional(),
    name: z.string().min(1, 'Medicine name is required'),
    type: z.string().optional(),
    manufacturer: z.string().optional(),
    shortComposition1: z.string().optional(),
    shortComposition2: z.string().optional(),
    saltComposition: z.string().optional(),
    isDiscontinued: z.boolean().optional().default(false)
});

export const updateMedicineSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    manufacturer: z.string().optional(),
    shortComposition1: z.string().optional(),
    shortComposition2: z.string().optional(),
    saltComposition: z.string().optional(),
    isDiscontinued: z.boolean().optional()
});
