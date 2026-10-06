import { z } from 'zod';

/**
 * Validation schema for creating a reminder job
 */
export const createReminderJobSchema = z.object({
  sourceType: z.enum(['ENCOUNTER', 'LAB_SCHEDULE']),
  sourceId: z.string().uuid(),
  userId: z.string().uuid(),
  scheduledFor: z.coerce.date(),
  channel: z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH']),
  templateKey: z.string().max(100),
  dedupeKey: z.string().max(200),
  payload: z.record(z.any()).nullable().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).default('PENDING'),
  attempts: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().min(1).max(10).default(5),
  lastError: z.string().max(500).nullable().optional()
});

/**
 * Validation schema for updating a reminder job
 */
export const updateReminderJobSchema = z.object({
  scheduledFor: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  attempts: z.number().int().min(0).optional(),
  payload: z.record(z.any()).nullable().optional(),
  lastError: z.string().max(500).nullable().optional(),
  notifyAt: z.coerce.date().nullable().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Validation schema for job ID parameter
 */
export const jobIdParamSchema = z.object({
  jobId: z.string().uuid()
});

/**
 * Validation schema for fetching reminder jobs with filters
 */
export const getReminderJobsSchema = z.object({
  sourceType: z.enum(['ENCOUNTER', 'LAB_SCHEDULE']).optional(),
  sourceId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
  channel: z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional()
});

/**
 * Validation schema for creating multiple reminders for an event
 */
export const createRemindersForEventSchema = z.object({
  sourceType: z.enum(['ENCOUNTER', 'LAB_SCHEDULE']),
  sourceId: z.string().uuid(),
  userId: z.string().uuid(),
  scheduledTime: z.coerce.date(),
  reminders: z.array(
    z.object({
      offsetMinutes: z.number().int(),
      channel: z.enum(['SMS', 'EMAIL', 'WHATSAPP', 'IN_APP', 'PUSH']),
      templateKey: z.string().max(100).optional()
    })
  ).min(1),
  payload: z.record(z.any()).nullable().optional()
});

/**
 * Validation schema for canceling reminders by source
 */
export const cancelRemindersBySourceSchema = z.object({
  sourceType: z.enum(['ENCOUNTER', 'LAB_SCHEDULE']),
  sourceId: z.string().uuid()
});

/**
 * Validation schema for recovering stuck jobs
 */
export const recoverStuckJobsSchema = z.object({
  timeoutMinutes: z.coerce.number().int().min(1).max(60).default(5).optional()
});

/**
 * Validation schema for processing a reminder job
 */
export const processReminderJobSchema = z.object({
  jobId: z.string().uuid(),
  job: z.record(z.any()).optional()
});

/**
 * Validation schema for getting pending due jobs
 */
export const getPendingDueJobsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100).optional()
});
