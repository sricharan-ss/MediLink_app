import { prisma } from '../../config/db.js';

export async function createPrescriptionMedicine(data) {
    return await prisma.prescriptionMedicine.create({
        data: {
            prescriptionId: data.prescriptionId,
            medicineId: data.medicineId,
            dosage: data.dosage,
            frequency: data.frequency,
            durationDays: data.durationDays,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updatePrescriptionMedicine(prescriptionMedicineId, data) {
    return await prisma.prescriptionMedicine.update({
        where: { prescriptionMedicineId: prescriptionMedicineId },
        data: {
            dosage: data.dosage,
            frequency: data.frequency,
            durationDays: data.durationDays,
            updatedAt: new Date()
        }
    })
}

export async function deletePrescriptionMedicine(prescriptionMedicineId) {
    return await prisma.prescriptionMedicine.delete({
        where: { prescriptionMedicineId: prescriptionMedicineId }
    })
}

export async function getPrescriptionMedicineById(prescriptionMedicineId) {
    return await prisma.prescriptionMedicine.findUnique({
        where: { prescriptionMedicineId: prescriptionMedicineId }
    })
}

export async function getPrescriptionMedicines(filters = {}) {
    const where = {};

    if (filters.prescriptionId) {
        where.prescriptionId = filters.prescriptionId;
    }

    if (filters.medicineId) {
        where.medicineId = filters.medicineId;
    }

    return await prisma.prescriptionMedicine.findMany({ where });
}