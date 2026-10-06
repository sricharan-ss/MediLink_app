import { prisma } from '../../config/db.js'

export async function createInventoryItem(data) {
    return await prisma.inventory.create({
        data: {
            hospitalId: data.hospitalId,
            medicineId: data.medicineId,
            batchNo: data.batchNo,
            quantity: data.quantity,
            expiryDate: new Date(data.expiryDate),
            reorderLevel: data.reorderLevel,
            managedBy: data.managedBy,
            price: data.price,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateInventoryItem(itemId, data) {
    return await prisma.inventory.update({
        where: { inventoryId: itemId },
        data: {
            hospitalId: data.hospitalId,
            medicineId: data.medicineId,
            batchNo: data.batchNo,
            quantity: data.quantity,
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
            reorderLevel: data.reorderLevel,
            managedBy: data.managedBy,
            price: data.price,
            updatedAt: new Date()
        }
    })
}

export async function deleteInventoryItem(itemId) {
    return await prisma.inventory.delete({
        where: { inventoryId: itemId }
    })
}

export async function getInventoryItemById(itemId) {
    return await prisma.inventory.findUnique({
        where: { inventoryId: itemId }
    })
}

export async function getInventoryItems(filters = {}) {
    const where = {};

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    if (filters.medicineId) {
        where.medicineId = filters.medicineId;
    }

    if (filters.batchNo) {
        where.batchNo = filters.batchNo;
    }

    if (filters.expiryDate) {
        where.expiryDate = new Date(filters.expiryDate);
    }

    return await prisma.inventory.findMany({ where });
}
