import { prisma } from '../../config/db.js';

export async function createDevice(data) {
    return await prisma.device.create({
        data: {
            name: data.name,
            deviceType: data.deviceType,
            manufacturer: data.manufacturer,
            model: data.model,
            calibrationDate: data.calibrationDate,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateDevice(deviceId, data) {
    return await prisma.device.update({
        where: { deviceId: deviceId },
        data: {
            name: data.name,
            deviceType: data.deviceType,
            manufacturer: data.manufacturer,
            model: data.model,
            calibrationDate: data.calibrationDate,
            updatedAt: new Date()
        }
    })
}

export async function deleteDevice(deviceId) {
    return await prisma.device.delete({
        where: { deviceId: deviceId }
    })
}

export async function getDeviceById(deviceId) {
    return await prisma.device.findUnique({
        where: { deviceId: deviceId }
    })
}

export async function getAllDevices(filters = {}) {
    const where = {};

    if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.deviceType) {
        where.deviceType = { contains: filters.deviceType, mode: 'insensitive' };
    }

    if (filters.manufacturer) {
        where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
    }

    return await prisma.device.findMany({ where });
}
