import * as vitalRepository from './vital.repo.js';
import { AppError } from '../../common/errors.js';

export async function createVital(data) {
    if (data.vitalId) {
        const vital = await vitalRepository.getVitalById(data.vitalId);
        if (vital) {
            throw new AppError('Vital already exists', 409);
        }
    }
    return await vitalRepository.createVital(data);
}

export async function updateVital(vitalId, data) {
    const vital = await vitalRepository.getVitalById(vitalId);
    if (!vital) {
        throw new AppError('Vital not found', 404);
    }
    return await vitalRepository.updateVital(vitalId, data);
}

export async function deleteVital(vitalId) {
    const vital = await vitalRepository.getVitalById(vitalId);
    if (!vital) {
        throw new AppError('Vital not found', 404);
    }
    return await vitalRepository.deleteVital(vitalId);
}

export async function getVitals(filters = {}) {
    const vitals = await vitalRepository.getVitals(filters);
    return vitals || [];
}       

export async function getVitalById(vitalId) {
    const vital = await vitalRepository.getVitalById(vitalId);
    if (!vital) {
        throw new AppError('Vital not found', 404);
    }
    return vital;
}