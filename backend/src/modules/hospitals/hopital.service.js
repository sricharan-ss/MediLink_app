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
  const hospitals = await getHospitals(filters);
  return hospitals.map((h) => {
    const doctors = h.doctorHospitals ? h.doctorHospitals.map((dh) => ({
      ...dh.doctor,
      hospitalId: h.hospitalId,
      hospitalName: h.name,
    })) : [];
    return {
      ...h,
      doctors,
      doctorCount: doctors.length,
    };
  });
};

export const getHospitalByIdService = async (hospitalId) => {
  const hospital = await getHospitalById(hospitalId);
  if (!hospital) return null;
  const doctors = hospital.doctorHospitals ? hospital.doctorHospitals.map((dh) => ({
    ...dh.doctor,
    hospitalId: hospital.hospitalId,
    hospitalName: hospital.name,
  })) : [];
  return {
    ...hospital,
    doctors,
    doctorCount: doctors.length,
  };
};
