import { prisma } from '../../config/db.js'

export async function createInvoiceItem(data) {
    return await prisma.invoiceItem.create({
        data: {
            invoiceId: data.invoiceId,
            itemType: data.itemType,
            itemId: data.itemId,
            description: data.description,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            discount: data.discount,
            totalPrice: data.totalPrice,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date()
        }
    });
}

export async function updateInvoiceItem(invoiceItemId, data) {
    return await prisma.invoiceItem.update({
        where: { invoiceItemId: invoiceItemId },
        data: {
            itemType: data.itemType,
            itemId: data.itemId,
            description: data.description,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            discount: data.discount,
            totalPrice: data.totalPrice,
            updatedAt: new Date()
        }
    });
}

export async function deleteInvoiceItem(invoiceItemId) {
    return await prisma.invoiceItem.delete({
        where: { invoiceItemId: invoiceItemId }
    })
}

export async function getInvoiceItemById(invoiceItemId) {
    return await prisma.invoiceItem.findUnique({
        where: { invoiceItemId: invoiceItemId }
    });
}

export async function getInvoiceItems(filters = {}) {
    const where = {};

    if (filters.invoiceId) {
        where.invoiceId = filters.invoiceId;
    }

    if (filters.itemType) {
        where.itemType = filters.itemType;
    }

    if (filters.itemId) {
        where.itemId = filters.itemId;
    }

    return await prisma.invoiceItem.findMany({ where });
}
