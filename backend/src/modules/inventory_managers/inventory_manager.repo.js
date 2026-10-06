import { prisma } from '../../config/db.js';

export async function createInventoryManager(data) {
    return await prisma.inventoryManager.create({
        data: {
            userId: data.userId,
            hospitalId: data.hospitalId,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateInventoryManager(inventoryManagerId, data) {
    return await prisma.inventoryManager.update({
        where: { managerId: inventoryManagerId },
        data: {
            userId: data.userId,
            hospitalId: data.hospitalId,
            updatedAt: new Date()
        }
    })
}

export async function deleteInventoryManager(inventoryManagerId) {
    return await prisma.inventoryManager.delete({
        where: { managerId: inventoryManagerId }
    })
}

export async function getInventoryManagerById(inventoryManagerId) {
    return await prisma.inventoryManager.findUnique({
        where: { managerId: inventoryManagerId }
    })
}

export async function getInventoryManagers(filters = {}) {
    const where = {};

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    return await prisma.inventoryManager.findMany({ where });
}
