import * as invoiceRepository from './invoice.repo.js';
import { AppError } from '../../common/errors.js';

export async function createInvoice(data) {
    // Create invoice only - payment is created separately when user clicks "Pay Now"
    try {
        return await invoiceRepository.createInvoice(data);
    } catch (error) {
        const isInvoiceNumberConflict =
            error &&
            error.code === 'P2002' &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes('invoiceNumber');

        if (!isInvoiceNumberConflict) {
            throw error;
        }

        const year = new Date().getFullYear();
        const invoiceData = {
            ...data,
            invoiceNumber: `INV-${year}-${Math.floor(100000 + Math.random() * 900000)}`,
        };
        return await invoiceRepository.createInvoice(invoiceData);
    }
}

export async function updateInvoice(invoiceId, data) {
    const invoice = await invoiceRepository.getInvoiceById(invoiceId);
    if (!invoice) {
        throw new AppError('Invoice not found', 404);
    }
    return await invoiceRepository.updateInvoice(invoiceId, data);
}

export async function deleteInvoice(invoiceId) {
    const invoice = await invoiceRepository.getInvoiceById(invoiceId);
    if (!invoice) {
        throw new AppError('Invoice not found', 404);
    }
    return await invoiceRepository.deleteInvoice(invoiceId);
}

export async function getInvoiceById(invoiceId) {
    const invoice = await invoiceRepository.getInvoiceById(invoiceId);
    if (!invoice) {
        throw new AppError('Invoice not found', 404);
    }
    return invoice;
}

export async function getInvoices(filters = {}) {
    const invoices = await invoiceRepository.getInvoices(filters);
    if (!invoices || invoices.length === 0) {
        return [];
    }
    return invoices;
}

export async function createMedicineInvoiceService({ patientId, hospitalId, deliveryAddress, notes, items }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Cart is empty. Please add items before checking out.', 400);
    }

    const { prisma } = await import('../../config/db.js');

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
        const medicineId = item.medicineId;
        const quantity = parseInt(item.quantity, 10);

        if (!medicineId || isNaN(quantity) || quantity <= 0) {
            throw new AppError('Invalid medicine ID or quantity in cart item', 400);
        }

        const medicine = await prisma.medicine.findUnique({
            where: { medicineId },
            include: {
                inventory: true
            }
        });

        if (!medicine) {
            throw new AppError(`Medicine with ID ${medicineId} not found`, 404);
        }

        if (medicine.isDiscontinued) {
            throw new AppError(`Cannot order discontinued medicine: ${medicine.name}`, 400);
        }

        // Determine unit price from inventory
        let unitPrice = null;
        if (medicine.inventory && medicine.inventory.length > 0) {
            // Find inventory matching hospital if provided, or first available with price
            const matchedInv = hospitalId 
                ? medicine.inventory.find(inv => inv.hospitalId === hospitalId && inv.price)
                : null;
            const chosenInv = matchedInv || medicine.inventory.find(inv => inv.price) || medicine.inventory[0];
            
            if (chosenInv && chosenInv.price) {
                unitPrice = parseFloat(chosenInv.price.toString());
            }

            // Check stock if tracked
            if (chosenInv && chosenInv.quantity !== null && chosenInv.quantity !== undefined) {
                if (chosenInv.quantity < quantity) {
                    throw new AppError(`Insufficient stock for ${medicine.name}. Available: ${chosenInv.quantity}`, 400);
                }
            }
        }

        if (unitPrice === null || isNaN(unitPrice)) {
            throw new AppError(`Price is currently unavailable for ${medicine.name}. Cannot place order.`, 400);
        }

        const lineTotal = unitPrice * quantity;
        totalAmount += lineTotal;

        validatedItems.push({
            itemType: 'MEDICINE',
            itemId: medicine.medicineId,
            description: `${medicine.name}${medicine.shortComposition1 ? ' (' + medicine.shortComposition1 + ')' : ''}`,
            quantity: quantity,
            unitPrice: unitPrice,
            discount: 0,
            totalPrice: lineTotal
        });
    }

    const taxRate = 0.05; // 5% GST on medicines
    const taxAmount = Math.round(totalAmount * taxRate * 100) / 100;
    const finalAmount = Math.round((totalAmount + taxAmount) * 100) / 100;

    const year = new Date().getFullYear();
    const invoiceNumber = `MED-${year}-${Math.floor(100000 + Math.random() * 900000)}`;

    const deliveryNote = [
        deliveryAddress ? `Delivery: ${deliveryAddress}` : null,
        notes ? `Notes: ${notes}` : null
    ].filter(Boolean).join(' | ');

    // Create Invoice and InvoiceItems in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
        const createdInvoice = await tx.invoice.create({
            data: {
                patientId,
                hospitalId: hospitalId || undefined,
                invoiceNumber,
                totalAmount,
                discountAmount: 0,
                taxAmount,
                finalAmount,
                status: 'PENDING',
                generatedAt: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                notes: deliveryNote || 'Medicine Order'
            }
        });

        for (const line of validatedItems) {
            await tx.invoiceItem.create({
                data: {
                    invoiceId: createdInvoice.invoiceId,
                    itemType: line.itemType,
                    itemId: line.itemId,
                    description: line.description,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    discount: line.discount,
                    totalPrice: line.totalPrice
                }
            });
        }

        return await tx.invoice.findUnique({
            where: { invoiceId: createdInvoice.invoiceId },
            include: {
                items: true,
                payments: true
            }
        });
    });

    return invoice;
}


