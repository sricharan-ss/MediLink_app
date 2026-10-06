import { z } from 'zod';

export const createInvoiceItemSchema = z.object({
    invoiceId: z.string().uuid(),
    itemType: z.enum(['ENCOUNTER', 'MEDICINE', 'LAB_TEST', 'BED_CHARGE', 'PROCEDURE', 'CONSULTATION', 'SURGERY', 'OTHER']),
    itemId: z.string().uuid().optional(),
    description: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().positive(),
    discount: z.number().nonnegative().optional(),
    totalPrice: z.number().positive(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export const updateInvoiceItemSchema = z.object({
    itemType: z.enum(['ENCOUNTER', 'MEDICINE', 'LAB_TEST', 'BED_CHARGE', 'PROCEDURE', 'CONSULTATION', 'SURGERY', 'OTHER']).optional(),
    itemId: z.string().uuid().optional(),
    description: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    unitPrice: z.number().positive().optional(),
    discount: z.number().nonnegative().optional(),
    totalPrice: z.number().positive().optional(),
    updatedAt: z.date().optional(),
});
