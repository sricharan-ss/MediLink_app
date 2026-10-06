import { prisma } from '../../config/db.js';

export async function createInvoice(data) {
    return await prisma.invoice.create({
        data: {
            patientId: data.patientId,
            hospitalId: data.hospitalId,
            invoiceNumber: data.invoiceNumber,
            totalAmount: data.totalAmount,
            discountAmount: data.discountAmount,
            taxAmount: data.taxAmount,
            finalAmount: data.finalAmount,
            status: data.status,
            generatedAt: data.generatedAt || new Date(),
            dueDate: data.dueDate,
            notes: data.notes,
            updatedAt: data.updatedAt || new Date()
        }
    });
}

export async function updateInvoice(invoiceId, data) {
    return await prisma.invoice.update({
        where: { invoiceId: invoiceId },
        data: {
            invoiceNumber: data.invoiceNumber,
            totalAmount: data.totalAmount,
            discountAmount: data.discountAmount,
            taxAmount: data.taxAmount,
            finalAmount: data.finalAmount,
            status: data.status,
            dueDate: data.dueDate,
            notes: data.notes,
            updatedAt: new Date()
        }
    });
}

export async function deleteInvoice(invoiceId) {
    return await prisma.invoice.delete({
        where: { invoiceId: invoiceId }
    })
}

export async function getInvoiceById(invoiceId) {
    return await prisma.invoice.findUnique({
        where: { invoiceId: invoiceId },
        include: {
            items: true,
            payments: true
        }
    });
}

export async function getInvoices(filters = {}) {
    const where = {};

    if (filters.patientId) {
        where.patientId = filters.patientId;
    }

    if (filters.hospitalId) {
        where.hospitalId = filters.hospitalId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.dueDate) {
        where.dueDate = filters.dueDate;
    }

    return await prisma.invoice.findMany({ 
        where,
        include: {
            items: true,
            payments: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}