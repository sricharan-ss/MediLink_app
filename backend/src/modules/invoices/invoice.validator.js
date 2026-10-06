import { z } from 'zod';

export const createInvoiceSchema = z.object({
    patientId: z.string().uuid(),
    hospitalId: z.string().uuid().optional(),
    invoiceNumber: z.string().optional(),
    totalAmount: z.number().positive(),
    discountAmount: z.number().nonnegative().optional(),
    taxAmount: z.number().nonnegative().optional(),
    finalAmount: z.number().positive(),
    status: z.enum(['DRAFT', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'OVERDUE']),
    generatedAt: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    paidDate: z.coerce.date().optional(),
    notes: z.string().optional(),
    updatedAt: z.date().optional(),
});

export const updateInvoiceSchema = z.object({
    invoiceNumber: z.string().optional(),
    totalAmount: z.number().positive().optional(),
    discountAmount: z.number().nonnegative().optional(),
    taxAmount: z.number().nonnegative().optional(),
    finalAmount: z.number().positive().optional(),
    status: z.enum(['DRAFT', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'OVERDUE']).optional(),
    dueDate: z.coerce.date().optional(),
    paidDate: z.coerce.date().optional(),
    notes: z.string().optional(),
});
