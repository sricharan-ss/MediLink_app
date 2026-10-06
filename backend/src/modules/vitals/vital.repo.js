import { prisma } from '../../config/db.js';

export async function createVital(data) {
    return await prisma.vital.create({
        data: {
            encounterId: data.encounterId,
            vitalTypeId: data.vitalTypeId,
            deviceId: data.deviceId,
            value: data.value,
            recordedAt: data.recordedAt,
            source: data.source,
            qualityScore: data.qualityScore
        }
    })
}

export async function updateVital(vitalId, data) {
    return await prisma.vital.update({
        where: { vitalId: vitalId },
        data: {
            encounterId: data.encounterId,
            vitalTypeId: data.vitalTypeId,
            deviceId: data.deviceId,
            value: data.value,
            recordedAt: data.recordedAt,
            source: data.source,
            qualityScore: data.qualityScore
        }
    })
}

export async function deleteVital(vitalId) {
    return await prisma.vital.delete({
        where: { vitalId: vitalId }
    })
}

export async function getVitals(filters = {}) {
    return await prisma.vital.findMany({
        where: {
            encounterId: filters.encounterId,
            vitalTypeId: filters.vitalTypeId,
            deviceId: filters.deviceId,
            recordedAt: filters.recordedAt,
            source: filters.source,
            qualityScore: filters.qualityScore
        }
    })
}

export async function getVitalById(vitalId) {   
    return await prisma.vital.findUnique({
        where: { vitalId: vitalId }
    })
}


