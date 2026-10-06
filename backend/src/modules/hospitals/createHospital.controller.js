import { createHospitalSchema } from './hospital.validate.js';
import { fromError } from 'zod-validation-error';
import { createHospitalService } from './hopital.service.js';
import { adminSubscribed } from './hospital.repo.js';

export const createHospital = async (req, res) => {
  const validatedData = createHospitalSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: fromError(validatedData.error).message,
    });
  }
  const adminId = req.adminId;
  const adminCheck = await adminSubscribed({ adminId });
  if (adminCheck.subscribed == false) {
    return res.status(400).json({
      success: false,
      message:
        'Admin is not subscribed to MediLink hospital cannot be created',
    });
  }
  if (adminCheck.hospital?.hospitalId) {
    return res.status(400).json({
      success: false,
      message: 'Admin already has a hospital',
    });
  }
  const hospitalInfo = validatedData.data;
  hospitalInfo.adminId = adminId;
  const data = await createHospitalService(hospitalInfo);
  return res.status(data.code).json({
    success: data.success,
    message: data.message,
    hospitalName: data.hospitalName,
  });
};

export const getHospitals = async (req, res, next) => {
  try {
    const { city, q, search } = req.query;
    const { getHospitalsService } = await import('./hopital.service.js');
    const hospitals = await getHospitalsService({ city, q, search });
    res.status(200).json(hospitals);
  } catch (err) {
    next(err);
  }
};

export const getHospitalById = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;
    const { getHospitalByIdService } = await import('./hopital.service.js');
    const hospital = await getHospitalByIdService(hospitalId);
    if (!hospital) {
      return res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Hospital not found'
      });
    }
    res.status(200).json(hospital);
  } catch (err) {
    next(err);
  }
};
