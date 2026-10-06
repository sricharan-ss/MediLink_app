import { z } from 'zod';

export const createNotificationSchema = z.object({
    userId: z.string().uuid(),
    title: z.string().max(255),
    message: z.string(),
    type: z.enum(['APPOINTMENT', 'LAB', 'PRESCRIPTION', 'PAYMENT', 'ADMISSION', 'DISCHARGE', 'ALERT']),
    relatedId: z.string().uuid().optional(),
    isRead: z.boolean().optional()
});

export const updateNotificationSchema = z.object({
    title: z.string().max(255).optional(),
    message: z.string().optional(),
    type: z.enum(['APPOINTMENT', 'LAB', 'PRESCRIPTION', 'PAYMENT', 'ADMISSION', 'DISCHARGE', 'ALERT']).optional(),
    relatedId: z.string().uuid().optional(),
    isRead: z.boolean().optional()
});