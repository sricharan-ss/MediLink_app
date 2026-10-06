import * as patientRepo from './patient.repo.js';
import { AppError } from '../../common/errors.js';

export async function createPatient(data) {
    const patients = await patientRepo.getPatients({ userId: data.userId });
    if(patients && patients.length > 0) {
        throw new AppError('Patient already exists for this user', 409);
    }
    return await patientRepo.createPatient(data);
}

export async function updatePatient(patientId, data) {
    const patient = await patientRepo.getPatientById(patientId);
    if (!patient) {
        throw new AppError('Patient not found', 404);
    }
    if (data.userId && patient.userId !== data.userId) {
        throw new AppError('Unauthorized to update this patient', 403);
    }
    return await patientRepo.updatePatient(patientId, data);
}

export async function deletePatient(patientId){
    const patient = await patientRepo.getPatientById(patientId);
    if (!patient) {
        throw new AppError('Patient not found for this user', 404);
    }
    return await patientRepo.deletePatient(patientId);
}

export async function getPatients(filters = {}) {
    const patients = await patientRepo.getPatients(filters);
    if (!patients || patients.length === 0) {
        throw new AppError('No patients found for the given filters', 404);
    }
    return patients;
}

export async function getPatientById(patientId) {
    const patient = await patientRepo.getPatientById(patientId);
    if (!patient) {
        throw new AppError('Patient not found', 404);
    }
    return patient;
}

function ageToDob(age) {
    const today = new Date();
    return new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
}

export async function upsertMyPatientProfile(userId, data) {
    if (!userId) {
        throw new AppError('Unauthorized user', 401);
    }

    const dob = ageToDob(data.age);
    const patient = await patientRepo.upsertPatientByUserId(userId, {
        gender: data.gender,
        dob,
        bloodGroup: data.bloodGroup,
        chronicConditions: data.chronicConditions || [],
    });

    return patient;
}
