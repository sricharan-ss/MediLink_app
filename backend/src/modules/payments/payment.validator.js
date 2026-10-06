import { z } from 'zod';

export const createPaymentSchema = z.object({
    invoiceId: z.string().uuid(),
    mode: z.enum(['CASH', 'CARD', 'ONLINE', 'INSURANCE', 'UPI', 'BANK_TRANSFER']),
    amount: z.number().positive(),
    transactionId: z.string().optional(),
    orderId: z.string().optional(),
    transactionDate: z.coerce.date().optional(),
    status: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED']),
    gatewayResponse: z.any().optional(),
    remarks: z.string().optional(),
    paidBy: z.string().optional(),
    receiptNumber: z.string().optional(),
    paidAt: z.coerce.date().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
});

export const updatePaymentSchema = z.object({
    mode: z.enum(['CASH', 'CARD', 'ONLINE', 'INSURANCE', 'UPI', 'BANK_TRANSFER']).optional(),
    amount: z.number().positive().optional(),
    transactionId: z.string().optional(),
    orderId: z.string().optional(),
    transactionDate: z.coerce.date().optional(),
    status: z.enum(['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
    gatewayResponse: z.any().optional(),
    remarks: z.string().optional(),
    paidBy: z.string().optional(),
    receiptNumber: z.string().optional(),
    paidAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
});
