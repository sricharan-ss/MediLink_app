import * as diagnosisRepository from './diagnosis.repo.js';
import { AppError } from '../../common/errors.js';

export async function createDiagnosis(data) {
    if (data.diagnosisId) {
        const diagnosis = await diagnosisRepository.getDiagnosisById(data.diagnosisId);
        if (diagnosis) {
            throw new AppError('Diagnosis already exists with this ID', 409);
        }
    }
    return await diagnosisRepository.createDiagnosis(data);
}

export async function updateDiagnosis(diagnosisId, data) {
    const diagnosis = await diagnosisRepository.getDiagnosisById(diagnosisId);
    if (!diagnosis) {
        throw new AppError('Diagnosis not found with this ID', 404);
    }
    return await diagnosisRepository.updateDiagnosis(diagnosisId, data);
}

export async function deleteDiagnosis(diagnosisId){
    const diagnosis = await diagnosisRepository.getDiagnosisById(diagnosisId);
    if (!diagnosis) {
        throw new AppError('Diagnosis not found with this ID', 404);
    }
    return await diagnosisRepository.deleteDiagnosis(diagnosisId);
}

export async function getDiagnoses(filters = {}) {
    const diagnoses = await diagnosisRepository.getDiagnoses(filters);

    if (!diagnoses || diagnoses.length === 0) {
        throw new AppError('No diagnoses found for the given filters', 404);
    }
    return diagnoses;
}

export async function getDiagnosisById(diagnosisId) {
    const diagnosis = await diagnosisRepository.getDiagnosisById(diagnosisId);
    if (!diagnosis) {
        throw new AppError('Diagnosis not found with this ID', 404);
    }
    return diagnosis;
}

