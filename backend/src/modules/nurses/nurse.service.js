import { createNurse, getNurseId } from './nurse.repo.js';
import { userSetUp } from '../users/user.repo.js';

export const createNurseService = async ({ department, licenseNo, userId }) => {
  const dbNurse = await getNurseId({ userId });
  if (dbNurse) {
    return {
      success: false,
      code: 400,
      message: 'nurse already exists with this user id',
    };
  }
  await createNurse({
    userId,
    department,
    licenseNo,
  });
  await userSetUp({ userId });
  return {
    success: true,
    code: 201,
    message: 'nurse created successfully',
  };
};
