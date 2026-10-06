import { z } from 'zod';

export const createAdmittedPatientSchema = z.object({
    patientId: z.string(),
    hospitalId: z.string(),
    doctorId: z.string(),
    bedId: z.string(),
    admissionDate: z.coerce.date(),
    dischargeDate: z.coerce.date().optional(),
    recoveryStatus: z.enum(['Stable', 'Critical', 'InRecovery']).optional(),
    predictedReadmission: z.coerce.date().optional(),
    bedNumber: z.string().optional(),
    ward: z.string().optional(),
});

export const updateAdmittedPatientSchema = z.object({
    bedId: z.string().optional(),
    dischargeDate: z.coerce.date().optional(),
    recoveryStatus: z.enum(['Stable', 'Critical', 'InRecovery']).optional(),
    predictedReadmission: z.coerce.date().optional(),
    bedNumber: z.string().optional(),
    ward: z.string().optional(),
});