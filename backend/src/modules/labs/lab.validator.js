import { z } from 'zod';

export const createLabSchema = z.object({
	hospitalId: z.string().uuid(),
	name: z.string().min(1),
	capacity: z.number().int().positive().optional(),
	labManagerId: z.string().uuid().optional(),
	availableSlots: z.number().int().min(0).optional(),
	bookedSlots: z.number().int().min(0).optional(),
});

export const updateLabSchema = z.object({
	name: z.string().min(1).optional(),
	capacity: z.number().int().positive().optional(),
	labManagerId: z.string().uuid().optional(),
	availableSlots: z.number().int().min(0).optional(),
	bookedSlots: z.number().int().min(0).optional(),
});
