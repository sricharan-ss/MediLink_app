import { z } from 'zod';

export const createFeedbackSchema = z.object({
    encounterId: z.string().uuid(),
    question: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
    submittedAt: z.coerce.date().optional()
});

export const updateFeedbackSchema = z.object({
    question: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().optional(),
    submittedAt: z.coerce.date().optional()
});

