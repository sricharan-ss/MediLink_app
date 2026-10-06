import { z } from 'zod';

export const createLabScheduleSchema = z.object({
	labId: z.string().uuid(),
	patientId: z.string().uuid().nullable().optional(),
	date: z.coerce.date(),
	slotTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
	slotDuration: z.number().int().positive(),
	isBooked: z.boolean().optional(),
	sourceType: z.enum(['PRESCRIPTION', 'ENCOUNTER', 'MANUAL', 'EXTERNAL']).optional(),
	sourceRefId: z.string().min(1).max(120).optional(),
	externalProviderId: z.string().min(1).max(120).optional(),
	externalBookingId: z.string().min(1).max(120).optional(),
	syncStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'SENT', 'CONFIRMED', 'FAILED']).optional(),
}).superRefine((data, ctx) => {
	if (data.sourceType && data.sourceType !== 'MANUAL' && !data.sourceRefId) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['sourceRefId'],
			message: 'sourceRefId is required when sourceType is not MANUAL',
		});
	}

	if (data.sourceType === 'EXTERNAL' && !data.externalProviderId) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['externalProviderId'],
			message: 'externalProviderId is required for EXTERNAL sourceType',
		});
	}
});

export const updateLabScheduleSchema = z.object({
	patientId: z.string().uuid().nullable().optional(),
	date: z.coerce.date().optional(),
	slotTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
	slotDuration: z.number().int().positive().optional(),
	isBooked: z.boolean().optional(),
	sourceType: z.enum(['PRESCRIPTION', 'ENCOUNTER', 'MANUAL', 'EXTERNAL']).optional(),
	sourceRefId: z.string().min(1).max(120).optional(),
	externalProviderId: z.string().min(1).max(120).nullable().optional(),
	externalBookingId: z.string().min(1).max(120).nullable().optional(),
	syncStatus: z.enum(['NOT_REQUIRED', 'PENDING', 'SENT', 'CONFIRMED', 'FAILED']).optional(),
});
