import { createLabManager, getLabManagerId } from './labManager.repo.js';
import { userSetUp } from '../users/user.repo.js';

export const createLabManagerService = async ({ userId }) => {
  const labManager = await getLabManagerId({ userId });
  if (labManager) {
    return {
      success: false,
      code: 400,
      message: 'labManager already exists with this user id',
    };
  }
  await createLabManager({ userId });
  await userSetUp({ userId });
  return {
    success: true,
    code: 201,
    message: 'labManager created successfully',
  };
};
