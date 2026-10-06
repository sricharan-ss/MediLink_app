import { prisma } from '../../config/db.js'

export async function createVitalType(data) {
    return await prisma.vitalType.create({
        data: {
            name: data.name,
            unit: data.unit,
            normalRange: data.normalRange,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}
        
export async function updateVitalType(vitalTypeId, data) {
    return await prisma.vitalType.update({
        where: { vitalTypeId: vitalTypeId },
        data: {
            name: data.name,
            unit: data.unit,
            normalRange: data.normalRange,
            createdAt: data.createdAt,
            updatedAt: new Date()
        }
    })
}

export async function deleteVitalType(vitalTypeId) {
    return await prisma.vitalType.delete({
        where: { vitalTypeId: vitalTypeId }
    })
}

export async function getAllVitalTypes(filters={}) {
    const where = {};
    if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
    }
    return await prisma.vitalType.findMany({ where });
}

export async function getVitalTypeById(vitalTypeId) {
    return await prisma.vitalType.findUnique({
        where: { vitalTypeId: vitalTypeId }
    })
}