import { z } from 'zod';

export const createSummarySchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().nullable(),
  keyFindings: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  labHistory: z.string().optional().nullable(),
  riskFactors: z.string().optional().nullable(),
  generatedBy: z.string().optional().nullable(),
});
