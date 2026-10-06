import { prisma } from '../../config/db.js';

export async function createMedicine(data) {
    return await prisma.medicine.create({
        data: {
            csvId: data.csvId,
            name: data.name,
            type: data.type,
            manufacturer: data.manufacturer,
            shortComposition1: data.shortComposition1,
            shortComposition2: data.shortComposition2,
            saltComposition: data.saltComposition,
            isDiscontinued: data.isDiscontinued || false,
        }
    });
}

export async function updateMedicine(medicineId, data) {
    return await prisma.medicine.update({
        where: { medicineId },
        data: {
            name: data.name,
            type: data.type,
            manufacturer: data.manufacturer,
            shortComposition1: data.shortComposition1,
            shortComposition2: data.shortComposition2,
            saltComposition: data.saltComposition,
            isDiscontinued: data.isDiscontinued,
        }
    });
}

export async function deleteMedicine(medicineId) {
    return await prisma.medicine.delete({
        where: { medicineId }
    });
}

export async function getMedicineById(medicineId) {
    return await prisma.medicine.findUnique({
        where: { medicineId },
        include: {
            inventory: {
                select: {
                    inventoryId: true,
                    hospitalId: true,
                    price: true,
                    quantity: true,
                    batchNo: true,
                    expiryDate: true
                }
            }
        }
    });
}

export async function getMedicineByCsvId(csvId) {
    return await prisma.medicine.findUnique({
        where: { csvId },
        include: {
            inventory: {
                select: {
                    inventoryId: true,
                    hospitalId: true,
                    price: true,
                    quantity: true
                }
            }
        }
    });
}

export async function getMedicines(filters = {}) {
    const where = {};

    if (filters.name) {
        where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { shortComposition1: { contains: filters.search, mode: 'insensitive' } },
            { saltComposition: { contains: filters.search, mode: 'insensitive' } },
            { manufacturer: { contains: filters.search, mode: 'insensitive' } },
            { type: { contains: filters.search, mode: 'insensitive' } }
        ];
    }

    if (filters.type) {
        where.type = { contains: filters.type, mode: 'insensitive' };
    }

    if (filters.manufacturer) {
        where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
    }

    if (filters.isDiscontinued !== undefined) {
        where.isDiscontinued = filters.isDiscontinued === true || filters.isDiscontinued === 'true';
    }

    if (filters.shortComposition1) {
        where.shortComposition1 = { contains: filters.shortComposition1, mode: 'insensitive' };
    }

    if (filters.shortComposition2) {
        where.shortComposition2 = { contains: filters.shortComposition2, mode: 'insensitive' };
    }

    if (filters.saltComposition) {
        where.saltComposition = { contains: filters.saltComposition, mode: 'insensitive' };
    }

    const take = filters.limit ? parseInt(filters.limit, 10) : 100;

    return await prisma.medicine.findMany({ 
        where,
        take,
        include: {
            inventory: {
                select: {
                    inventoryId: true,
                    hospitalId: true,
                    price: true,
                    quantity: true
                }
            }
        },
        orderBy: { name: 'asc' }
    });
}

export async function deleteMedicinesByCsvIds(csvIds) {
    return await prisma.medicine.deleteMany({
        where: { csvId: { in: csvIds } }
    });
}
