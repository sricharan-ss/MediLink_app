import { createHospital, linkAdmin, getHospitals, getHospitalById } from './hospital.repo.js';

export const createHospitalService = async ({
  name,
  address,
  city,
  adminId,
}) => {
  const newHospital = await createHospital({ name, address, city });
  await linkAdmin({ adminId, hospitalId: newHospital.hospitalId });
  return {
    success: true,
    message: 'Hospital created successfully',
    hospitalName: newHospital.name,
    code: 201,
  };
};

export const getHospitalsService = async (filters = {}) => {
  return await getHospitals(filters);
};

export const getHospitalByIdService = async (hospitalId) => {
  return await getHospitalById(hospitalId);
};
