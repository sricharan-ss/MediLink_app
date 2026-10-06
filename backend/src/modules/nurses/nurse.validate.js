import { z } from 'zod';

export const createNurseSchema = z.object({
  department: z.string().min(1, 'departement cannot be null'),
  licenseNo: z.string().optional(),
});

