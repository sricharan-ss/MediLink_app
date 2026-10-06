import { prisma } from '../../config/db.js';

export async function createDiagnosis(data) {
    const symptomsValue = Array.isArray(data.symptoms) ? data.symptoms.join(', ') : data.symptoms;
    const allergiesValue = Array.isArray(data.allergiesNoted) ? data.allergiesNoted.join(', ') : data.allergiesNoted;

    return await prisma.diagnosis.create({
        data: {
            encounterId: data.encounterId,
            icdCode: data.icdCode,
            diagnosisText: data.diagnosisText,
            symptoms: symptomsValue,
            allergiesNoted: allergiesValue,
            severity: data.severity,
            diagnosedAt: data.diagnosedAt,
            updatedAt: new Date()
        }
    })
}

export async function updateDiagnosis(diagnosisId, data) {
    const symptomsValue = Array.isArray(data.symptoms) ? data.symptoms.join(', ') : data.symptoms;
    const allergiesValue = Array.isArray(data.allergiesNoted) ? data.allergiesNoted.join(', ') : data.allergiesNoted;

    return await prisma.diagnosis.update({
        where: { diagnosisId: diagnosisId },
        data: {
            icdCode: data.icdCode,
            diagnosisText: data.diagnosisText,
            symptoms: symptomsValue,
            allergiesNoted: allergiesValue,
            severity: data.severity,
            updatedAt: new Date()
        }
    })
}

export async function deleteDiagnosis(diagnosisId) {
    return await prisma.diagnosis.delete({
        where: { diagnosisId: diagnosisId }
    })
}

export async function getDiagnosisById(diagnosisId) {
    return await prisma.diagnosis.findUnique({
        where: { diagnosisId: diagnosisId }
    })
}

export async function getDiagnoses(filters = {}) {
    const where = {};

    if (filters.encounterId) {
        where.encounterId = filters.encounterId;
    }

    if (filters.icdCode) {
        where.icdCode = filters.icdCode;
    }

    if (filters.severity) {
        where.severity = filters.severity;
    }

    return await prisma.diagnosis.findMany({ where });
}