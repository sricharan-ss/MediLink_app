import { z } from 'zod';

export const createPatientSchema = z.object({
  age: z.number().int().positive('Age must be a positive integer'),
  gender: z.string().min(1, 'Gender is required'),
  dob: z.string(),
  // dob: z.date(),
  bloodGroup: z.string().optional(),
});
