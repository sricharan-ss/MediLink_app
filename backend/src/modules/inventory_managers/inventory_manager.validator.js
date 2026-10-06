import { z } from 'zod';

export const createInventoryManagerSchema = z.object({
    userId: z.string().uuid(),
    hospitalId: z.string().uuid(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    }),
    updatedAt: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    })
});

export const updateInventoryManagerSchema = z.object({
    userId: z.string().uuid().optional(),
    hospitalId: z.string().uuid().optional(),
    updatedAt: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    }).optional()
});