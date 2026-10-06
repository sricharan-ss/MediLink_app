import { createLabManagerService } from './labManager.service.js';

export const createLabManager = async (req, res) => {
  const userId = req.userId;
  const data = await createLabManagerService({ userId });
  return res.status(data.code).json({
    success: data.success,
    message: data.message,
  });
};
