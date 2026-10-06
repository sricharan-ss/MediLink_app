import * as paymentRepo from './payment.repo.js';
import { AppError } from '../../common/errors.js';
import * as razorpay from '../../config/razorpay.js';

export async function createPayment(data) {
    // Create payment - retry with unique transaction identifiers for repeatable test runs.
    try {
        return await paymentRepo.createPayment(data);
    } catch (error) {
        const isUniqueConstraintError =
            error &&
            error.code === 'P2002' &&
            Array.isArray(error.meta?.target);

        if (!isUniqueConstraintError) {
            throw error;
        }

        const suffix = Date.now().toString().slice(-6);
        const retryPayload = {
            ...data,
            transactionId: data.transactionId ? `${data.transactionId}-${suffix}` : data.transactionId,
            receiptNumber: data.receiptNumber ? `${data.receiptNumber}-${suffix}` : data.receiptNumber,
        };

        return await paymentRepo.createPayment(retryPayload);
    }
}

export async function createRazorpayOrder(invoiceId, amount, currency = 'INR', notes = {}) {
    // Check if a recent pending payment already exists for this invoice (within last 15 minutes)
    const existingPayments = await paymentRepo.getPayments({ 
        invoiceId: invoiceId,
        status: 'PENDING'
    });
    
    // If a pending payment exists and was created recently, return it instead of creating a new one
    if (existingPayments && existingPayments.length > 0) {
        // Sort by createdAt descending to get the most recent payment
        const sortedPayments = existingPayments.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const existingPayment = sortedPayments[0];
        
        // Check if payment was created within last 15 minutes (900000 ms)
        const paymentAge = Date.now() - new Date(existingPayment.createdAt).getTime();
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (paymentAge < fifteenMinutes && existingPayment.orderId) {
            try {
                const existingOrder = await razorpay.fetchOrder(existingPayment.orderId);
                
                // Check if order is still valid (not expired)
                if (existingOrder.status !== 'paid' && existingOrder.status !== 'attempted') {
                    console.log(`Reusing existing pending payment ${existingPayment.paymentId} for invoice ${invoiceId}`);
                    return { 
                        payment: existingPayment, 
                        order: existingOrder,
                        isExisting: true,
                        message: 'Using existing pending payment. Please complete the payment.'
                    };
                }
            } catch (error) {
                // If order fetch fails, create a new one
                console.log('Existing order not found or invalid, creating new one:', error.message);
            }
        }
    }
    
    // Create Razorpay order
    const order = await razorpay.createOrder(amount, currency, notes);
    
    // Create payment record with pending status
    const payment = await paymentRepo.createPayment({
        invoiceId: invoiceId,
        orderId: order.id,
        amount: amount / 100, // Convert paise to rupees
        mode: 'ONLINE',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    
    console.log(`Created new payment ${payment.paymentId} for invoice ${invoiceId}`);
    return { payment, order, isExisting: false };
}

export async function verifyAndCapturePayment(paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature) {
    // Verify signature
    const isValid = razorpay.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    
    if (!isValid) {
        throw new AppError('Invalid payment signature', 400);
    }
    
    // Fetch payment details from Razorpay
    const razorpayPaymentDetails = await razorpay.fetchPayment(razorpayPaymentId);
    
    // Update payment record
    const isSuccess = razorpayPaymentDetails.status === 'captured';
    const payment = await paymentRepo.updatePayment(paymentId, {
        transactionId: razorpayPaymentId,
        status: isSuccess ? 'SUCCESS' : 'PENDING',
        gatewayResponse: razorpayPaymentDetails,
        paidAt: isSuccess ? new Date() : null,
        updatedAt: new Date()
    });

    // If payment is successful, mark invoice as PAID and decrement inventory if applicable
    if (isSuccess && payment.invoiceId) {
        const { prisma } = await import('../../config/db.js');
        await prisma.invoice.update({
            where: { invoiceId: payment.invoiceId },
            data: {
                status: 'PAID',
                paidDate: new Date()
            }
        });

        // Query invoice items to decrement inventory quantity where itemType = MEDICINE
        const invoiceItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: payment.invoiceId, itemType: 'MEDICINE' }
        });

        for (const line of invoiceItems) {
            if (line.itemId) {
                // Find inventory item for this medicine
                const inv = await prisma.inventory.findFirst({
                    where: { medicineId: line.itemId }
                });
                if (inv && inv.quantity !== null && inv.quantity !== undefined) {
                    const newQty = Math.max(0, inv.quantity - line.quantity);
                    await prisma.inventory.update({
                        where: { inventoryId: inv.inventoryId },
                        data: { quantity: newQty }
                    });
                }
            }
        }
    }
    
    return payment;
}

export async function capturePayment(razorpayPaymentId, amount, currency = 'INR') {
    const capturedPayment = await razorpay.capturePayment(razorpayPaymentId, amount, currency);
    return capturedPayment;
}

export async function refundPayment(paymentId, amount = null, notes = {}) {
    const payment = await paymentRepo.getPaymentById(paymentId);
    if (!payment) {
        throw new AppError('Payment not found', 404);
    }
    
    if (!payment.transactionId) {
        throw new AppError('No transaction ID found for this payment', 400);
    }
    
    // Create refund
    const refund = await razorpay.createRefund(payment.transactionId, amount, notes);
    
    // Update payment status
    await paymentRepo.updatePayment(paymentId, {
        status: 'REFUNDED',
        gatewayResponse: { ...payment.gatewayResponse, refund },
        updatedAt: new Date()
    });
    
    return refund;
}

export async function updatePayment(paymentId, data) {
    const payment = await paymentRepo.getPaymentById(paymentId);
    if (!payment) {
        throw new AppError('Payment not found', 404);
    }
    return await paymentRepo.updatePayment(paymentId, data);
}

export async function deletePayment(paymentId) {
    const payment = await paymentRepo.getPaymentById(paymentId);
    if (!payment) {
        throw new AppError('Payment not found', 404);
    }
    return await paymentRepo.deletePayment(paymentId);
}

export async function getPaymentById(paymentId) {
    const payment = await paymentRepo.getPaymentById(paymentId);
    if (!payment) {
        throw new AppError('Payment not found', 404);
    }
    return payment;
}

export async function getPayments(filters = {}) {
    const payments = await paymentRepo.getPayments(filters);
    if (!payments || payments.length === 0) {
        return [];
    }
    return payments;
}

