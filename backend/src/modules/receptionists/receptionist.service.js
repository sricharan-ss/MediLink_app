import { userSetUp } from '../users/user.repo.js';
import { createReceptionist, getReceptionistId } from './receptionist.repo.js';

export const createReceptionistService = async ({ userId }) => {
  const receptionist = await getReceptionistId({ userId });
  if (receptionist) {
    return {
      code: 400,
      success: false,
      message: 'receptionist already exists with this user id',
    };
  }
  await createReceptionist({ userId });
  await userSetUp({ userId });
  return {
    code: 201,
    success: true,
    message: 'receptionist created successfully',
  };
};
