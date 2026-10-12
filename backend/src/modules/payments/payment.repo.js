import { prisma } from '../../config/db.js'

export async function createPayment(data) {
    return await prisma.payment.create({
        data: {
            invoiceId: data.invoiceId,
            mode: data.mode,
            amount: data.amount,
            transactionId: data.transactionId,
            orderId: data.orderId,
            transactionDate: data.transactionDate,
            status: data.status,
            gatewayResponse: data.gatewayResponse,
            remarks: data.remarks,
            paidBy: data.paidBy,
            receiptNumber: data.receiptNumber,
            paidAt: data.paidAt,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date()
        }
    });
}

export async function updatePayment(paymentId, data) {
    return await prisma.payment.update({
        where: { paymentId: paymentId },
        data: {
            mode: data.mode,
            amount: data.amount,
            transactionId: data.transactionId,
            orderId: data.orderId,
            transactionDate: data.transactionDate,
            status: data.status,
            gatewayResponse: data.gatewayResponse,
            remarks: data.remarks,
            paidBy: data.paidBy,
            receiptNumber: data.receiptNumber,
            paidAt: data.paidAt,
            updatedAt: new Date()
        }
    });
}

export async function deletePayment(paymentId) {
    return await prisma.payment.delete({
        where: { paymentId: paymentId }
    })
}

export async function getPaymentById(paymentId) {
    return await prisma.payment.findUnique({
        where: { paymentId: paymentId }
    });
}

export async function getPayments(filters = {}) {
    const where = {};

    if (filters.invoiceId) {
        where.invoiceId = filters.invoiceId;
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.patientId) {
        where.invoice = {
            patientId: filters.patientId
        };
    }

    if (filters.search || filters.q) {
        const term = (filters.search || filters.q).trim();
        where.OR = [
            { transactionId: { contains: term, mode: 'insensitive' } },
            { orderId: { contains: term, mode: 'insensitive' } },
            { receiptNumber: { contains: term, mode: 'insensitive' } },
            { invoice: { patient: { user: { firstName: { contains: term, mode: 'insensitive' } } } } },
            { invoice: { patient: { user: { lastName: { contains: term, mode: 'insensitive' } } } } },
        ];
    }

    return await prisma.payment.findMany({ 
        where,
        include: {
            invoice: {
                include: {
                    items: true,
                    patient: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}