import { fromError } from 'zod-validation-error';
import { createNurseSchema } from './nurse.validate.js';
import { createNurseService } from './nurse.service.js';

export const createNurse = async (req, res) => {
  const validateResult = createNurseSchema.safeParse(req.body);
  if (!validateResult.success) {
    return res.status(400).json({
      success: false,
      message: 'invalid input',
      error: fromError(validateResult.error).message,
    });
  }
  const nurseData = validateResult.data;
  nurseData.userId = req.userId;
  const data = await createNurseService(nurseData);
  return res
    .status(data.code)
    .json({ message: data.message, success: data.success });
};
