import * as vitalTypeRepository from './vital_type.repo.js';
import { AppError } from '../../common/errors.js';

export async function create(data) {
    if (data.vitalTypeId) {
        const vitalType = await vitalTypeRepository.getVitalTypeById(data.vitalTypeId);
        if (vitalType) {
            throw new AppError('Vital type already exists', 409);
        }
    }
    return await vitalTypeRepository.createVitalType(data);
}

export async function update(vitalTypeId, data) {
    const existingVitalType = await vitalTypeRepository.getVitalTypeById(vitalTypeId);
    if (!existingVitalType) {
        throw new AppError('Vital type not found', 404);
    }
    return await vitalTypeRepository.updateVitalType(vitalTypeId, data);
}

export async function remove(vitalTypeId) {
    const existingVitalType = await vitalTypeRepository.getVitalTypeById(vitalTypeId);
    if (!existingVitalType) {
        throw new AppError('Vital type not found', 404);
    }
    return await vitalTypeRepository.deleteVitalType(vitalTypeId);
}

export async function getAll(filters = {}) {
    const vitalTypes = await vitalTypeRepository.getAllVitalTypes(filters);
    if (!vitalTypes || vitalTypes.length === 0) {
        throw new AppError('No vital types found for the given filters', 404);
    }
    return vitalTypes;
}

export async function getById(vitalTypeId) {
    const vitalType = await vitalTypeRepository.getVitalTypeById(vitalTypeId);
    if (!vitalType) {
        throw new AppError('Vital type not found', 404);
    }
    return vitalType;
}