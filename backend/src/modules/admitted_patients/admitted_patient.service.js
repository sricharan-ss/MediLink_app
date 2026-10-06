import * as admittedPatientRepository from './admitted_patient.repo.js';
import { AppError } from '../../common/errors.js';

export async function createAdmittedPatient(data) {
    return await admittedPatientRepository.createAdmittedPatient(data);
}

export async function updateAdmittedPatient(admittedPatientId, data) {
    const patient = await admittedPatientRepository.getAdmittedPatientById(admittedPatientId);
    if (!patient) {
        throw new AppError('Admitted patient not found', 404);
    }
    return await admittedPatientRepository.updateAdmittedPatient(admittedPatientId, data);
}

export async function deleteAdmittedPatient(admittedPatientId) {
    const patient = await admittedPatientRepository.getAdmittedPatientById(admittedPatientId);
    if (!patient) {
        throw new AppError('Admitted patient not found', 404);
    }
    return await admittedPatientRepository.deleteAdmittedPatient(admittedPatientId);
}

export async function getAdmittedPatientById(admittedPatientId) {
    const patient = await admittedPatientRepository.getAdmittedPatientById(admittedPatientId);
    if (!patient) {
        throw new AppError('Admitted patient not found', 404);
    }
    return patient;
}

export async function getAdmittedPatients(filters = {}) {
    const patients = await admittedPatientRepository.getAdmittedPatients(filters);
    if (!patients || patients.length === 0) {
        throw new AppError('No admitted patients found for the given filters', 404);
    }
    return patients;
}
