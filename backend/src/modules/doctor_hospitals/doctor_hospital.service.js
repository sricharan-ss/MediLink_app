import * as doctorHospitalRepo from './doctor_hospital.repo.js';
import { AppError } from '../../common/errors.js';

export async function createDoctorHospital(data) {
    const existingAssoc = await doctorHospitalRepo.getDoctorHospitals({ doctorId: data.doctorId, hospitalId: data.hospitalId });
    if (existingAssoc && existingAssoc.length > 0) {
        throw new AppError('Doctor-Hospital association already exists', 409);
    }
    return await doctorHospitalRepo.createDoctorHospital(data);
}

export async function updateDoctorHospital(doctorHospitalId, data) {
    const doctorHospital = await doctorHospitalRepo.getDoctorHospitalById(doctorHospitalId);
    if (!doctorHospital) {
        throw new AppError('Doctor-Hospital association not found', 404);
    }
    return await doctorHospitalRepo.updateDoctorHospital(doctorHospitalId, data);
}

export async function deleteDoctorHospital(doctorHospitalId){
    const doctorHospital = await doctorHospitalRepo.getDoctorHospitalById(doctorHospitalId);
    if (!doctorHospital) {
        throw new AppError('Doctor-Hospital association not found', 404);
    }
    return await doctorHospitalRepo.deleteDoctorHospital(doctorHospitalId);
}

export async function getDoctorHospitals(filters = {}) {
    const doctorHospitals = await doctorHospitalRepo.getDoctorHospitals(filters);
    if (!doctorHospitals || doctorHospitals.length === 0) {
        throw new AppError('No Doctor-Hospital associations found for the given filters', 404);
    }
    return doctorHospitals;
}

export async function getDoctorHospitalById(doctorHospitalId) {
    const doctorHospital = await doctorHospitalRepo.getDoctorHospitalById(doctorHospitalId);
    if (!doctorHospital) {
        throw new AppError('Doctor-Hospital association not found', 404);
    }
    return doctorHospital;
}

