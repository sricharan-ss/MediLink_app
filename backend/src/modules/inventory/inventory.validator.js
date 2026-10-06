import { z } from 'zod';

export const createInventoryItemSchema = z.object({
    hospitalId: z.string().uuid(),
    medicineId: z.string().uuid(),
    batchNo: z.string(),
    quantity: z.number().int().positive(),
    expiryDate: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    }),
    reorderLevel: z.number().int().positive(),
    managedBy: z.string().uuid(),
    price: z.number().positive(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    }),
    updatedAt: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    })
});


export const updateInventoryItemSchema = z.object({
    hospitalId: z.string().uuid().optional(),
    medicineId: z.string().uuid().optional(),
    batchNo: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    expiryDate: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    }).optional(),
    reorderLevel: z.number().int().positive().optional(),
    managedBy: z.string().uuid().optional(),
    price: z.number().positive().optional(),
    updatedAt: z.string().refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid date format'
    }).optional()
});
