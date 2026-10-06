import { fromError } from 'zod-validation-error';
import { createPatientSchema } from './patient.validate.js';
import { createPatientService } from './patient.service.js';

export const createPatient = async (req, res) => {
  const validatedData = createPatientSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: fromError(validatedData.error).message,
    });
  }
  const userId = req.userId;
  const userData = validatedData.data;
  userData.userId = userId;
  const data = await createPatientService(userData);
  return res.status(data.code).json({
    success: data.success,
    message: data.message,
  });
};
