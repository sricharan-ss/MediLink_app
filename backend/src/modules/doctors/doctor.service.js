import * as doctorRepository from './doctor.repo.js';
import { AppError } from '../../common/errors.js';

export async function createDoctor(data) {
    const doctors = await doctorRepository.getDoctors({ userId: data.userId });
    if (doctors && doctors.length > 0) {
        throw new AppError('Doctor already exists for this user', 409);
    }
    return await doctorRepository.createDoctor(data);
}

export async function updateDoctor(doctorId, data) {
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if (!doctor) {
        throw new AppError('Doctor not found', 404);
    }
    if (data.userId && doctor.userId !== data.userId) {
        throw new AppError('Unauthorized to update this doctor', 403);
    }
    return await doctorRepository.updateDoctor(doctorId, data);
}

export async function deleteDoctor(doctorId){
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if (!doctor) {
        throw new AppError('Doctor not found', 404);
    }
    return await doctorRepository.deleteDoctor(doctorId);
}

export async function getDoctorById(doctorId) {
    const doctor = await doctorRepository.getDoctorById(doctorId);
    if(!doctor) {
        throw new AppError('Doctor not found', 404);
    }
    return doctor;
}

export async function getDoctors(filters = {}) {
    const doctors = await doctorRepository.getDoctors(filters);
    if (!doctors || doctors.length === 0) {
        throw new AppError('No doctors found for the given filters', 404);
    }
    return doctors;
}
