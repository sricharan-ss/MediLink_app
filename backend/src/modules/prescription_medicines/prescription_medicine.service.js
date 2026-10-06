import * as prescriptionMedicineRepository from './prescription_medicine.repo.js'
import { AppError } from '../../common/errors.js'

export async function createPrescriptionMedicine(data) {
    return await prescriptionMedicineRepository.createPrescriptionMedicine(data);
}

export async function updatePrescriptionMedicine(prescriptionMedicineId, data) {
    const prescriptionMedicine = await prescriptionMedicineRepository.getPrescriptionMedicineById(prescriptionMedicineId);
    if (!prescriptionMedicine) {
        throw new AppError('Prescription medicine not found', 404);
    }
    return await prescriptionMedicineRepository.updatePrescriptionMedicine(prescriptionMedicineId, data);
}

export async function deletePrescriptionMedicine(prescriptionMedicineId) {
    const prescriptionMedicine = await prescriptionMedicineRepository.getPrescriptionMedicineById(prescriptionMedicineId);
    if (!prescriptionMedicine) {
        throw new AppError('Prescription medicine not found', 404);
    }
    return await prescriptionMedicineRepository.deletePrescriptionMedicine(prescriptionMedicineId);
}

export async function getPrescriptionMedicineById(prescriptionMedicineId) {
    const prescriptionMedicine = await prescriptionMedicineRepository.getPrescriptionMedicineById(prescriptionMedicineId);
    if (!prescriptionMedicine) {
        throw new AppError('Prescription medicine not found', 404);
    }
    return prescriptionMedicine;
}

export async function getPrescriptionMedicines(filters = {}) {
    const prescriptionMedicines = await prescriptionMedicineRepository.getPrescriptionMedicines(filters);
    if (!prescriptionMedicines || prescriptionMedicines.length === 0) {
        return [];
    }
    return prescriptionMedicines;
}

