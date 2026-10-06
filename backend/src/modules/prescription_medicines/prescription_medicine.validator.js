import { z } from 'zod';

export const createPrescriptionMedicineSchema = z.object({
    prescriptionId: z.string().uuid(),
    medicineId: z.string().uuid(),
    dosage: z.string(),
    frequency: z.string(),
    durationDays: z.number().int().positive()
});

export const updatePrescriptionMedicineSchema = z.object({
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    durationDays: z.number().int().positive().optional()
});