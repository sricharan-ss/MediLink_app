import * as medicineRepository from './medicine.repo.js';
import { AppError } from '../../common/errors.js';

export async function createMedicine(data) {
    if (!data.name) {
        throw new AppError('Medicine name is required', 400);
    }
    
    const existing = data.csvId && await medicineRepository.getMedicineByCsvId(data.csvId);
    if (existing) {
        throw new AppError('Medicine with this CSV ID already exists', 400);
    }
    
    return await medicineRepository.createMedicine(data);
}

export async function updateMedicine(medicineId, data) {
    const medicine = await medicineRepository.getMedicineById(medicineId);
    if (!medicine) {
        throw new AppError('Medicine not found', 404);
    }
    return await medicineRepository.updateMedicine(medicineId, data);
}

export async function deleteMedicine(medicineId) {
    const medicine = await medicineRepository.getMedicineById(medicineId);
    if (!medicine) {
        throw new AppError('Medicine not found', 404);
    }
    return await medicineRepository.deleteMedicine(medicineId);
}

export async function getMedicineById(medicineId) {
    const medicine = await medicineRepository.getMedicineById(medicineId);
    if (!medicine) {
        throw new AppError('Medicine not found', 404);
    }
    return medicine;
}

export async function getMedicines(filters = {}) {
    const medicines = await medicineRepository.getMedicines(filters);
    return medicines;
}


