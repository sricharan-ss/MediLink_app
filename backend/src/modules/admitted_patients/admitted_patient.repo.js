import { prisma } from '../../config/db.js';

export async function createAdmittedPatient(data) {
    return await prisma.admittedPatient.create({
        data: {
            patientId: data.patientId,
            hospitalId: data.hospitalId,
            bedId: data.bedId,
            admissionDate: data.admissionDate,
            dischargeDate: data.dischargeDate,
            recoveryStatus: data.recoveryStatus,
            predictedReadmission: data.predictedReadmission,
            bedNumber: data.bedNumber,
            ward: data.ward,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateAdmittedPatient(admittedPatientId, data) {
    return await prisma.admittedPatient.update({
        where: { admissionId: admittedPatientId },
        data: {
            bedId: data.bedId,
            dischargeDate: data.dischargeDate,
            recoveryStatus: data.recoveryStatus,
            predictedReadmission: data.predictedReadmission,
            bedNumber: data.bedNumber,
            ward: data.ward,
            updatedAt: new Date()
        }
    })
}

export async function deleteAdmittedPatient(admittedPatientId) {
    return await prisma.admittedPatient.delete({
        where: { admissionId: admittedPatientId }
    })
}

export async function getAdmittedPatientById(admittedPatientId) {
    return await prisma.admittedPatient.findUnique({
        where: { admissionId: admittedPatientId }
    })
}

export async function getAdmittedPatients(filters = {}) {
    const where = {};

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    if (filters.patientId) {
        where.patientId = filters.patientId;
    }

    if (filters.bedId) {
        where.bedId = filters.bedId;
    }

    return await prisma.admittedPatient.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
}