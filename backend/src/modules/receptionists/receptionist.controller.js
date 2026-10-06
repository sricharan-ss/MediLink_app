import { createReceptionistService } from './receptionist.service.js';

export const createReceptionist = async (req, res) => {
  const userId = req.userId;
  const data = await createReceptionistService({ userId });
  return res
    .status(data.code)
    .json({ message: data.message, success: data.success });
};
