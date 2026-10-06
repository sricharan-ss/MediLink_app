import { z } from 'zod';

// Use zod's datetime validator for strict ISO datetime checks
const dateTimeSchema = z.string().datetime({
  message: 'Invalid ISO datetime',
});

export const createEncounterSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  hospitalId: z.string().uuid(),
  scheduledTime: dateTimeSchema.or(z.date()),
  duration: z.number().int().positive().default(30),
  tokenNo: z.number().int().positive().optional(), // Auto-generated, optional
  visitType: z.enum(['OPD', 'IPD', 'EMERGENCY']),
  reason: z.string().optional(),
  notes: z.string().optional(),
  previousEncounterId: z.string().uuid().optional(), // For follow-up visits
});

export const updateEncounterSchema = z.object({
  scheduledTime: dateTimeSchema.or(z.date()).optional(),
  duration: z.number().int().positive().optional(),
  tokenNo: z.number().int().positive().optional(), // Optional in updates
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),
  visitType: z.enum(['OPD', 'IPD', 'EMERGENCY']).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  cancellationNote: z.string().optional(),
  actualStartTime: dateTimeSchema.or(z.date()).optional(),
  actualEndTime: dateTimeSchema.or(z.date()).optional(),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  outcome: z.string().optional(),
  followUpDate: dateTimeSchema.or(z.date()).optional(),
  revisited: z.boolean().optional(),
});
