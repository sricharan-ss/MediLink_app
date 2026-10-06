import * as invoiceItemRepository from './invoice_item.repo.js';
import { AppError } from '../../common/errors.js';

export async function createInvoiceItem(data) {
    if (data.invoiceItemId) {
        const invoiceItem = await invoiceItemRepository.getInvoiceItemById(data.invoiceItemId);
        if (invoiceItem) {
            throw new AppError('Invoice item with this ID already exists', 400);
        }
    }
    return await invoiceItemRepository.createInvoiceItem(data);
}

export async function updateInvoiceItem(invoiceItemId, data) {
    const invoiceItem = await invoiceItemRepository.getInvoiceItemById(invoiceItemId);
    if (!invoiceItem) {
        throw new AppError('Invoice item not found', 404);
    }
    return await invoiceItemRepository.updateInvoiceItem(invoiceItemId, data);
}

export async function deleteInvoiceItem(invoiceItemId) {
    const invoiceItem = await invoiceItemRepository.getInvoiceItemById(invoiceItemId);
    if (!invoiceItem) {
        throw new AppError('Invoice item not found', 404);
    }
    return await invoiceItemRepository.deleteInvoiceItem(invoiceItemId);
}

export async function getInvoiceItemById(invoiceItemId) {
    const invoiceItem = await invoiceItemRepository.getInvoiceItemById(invoiceItemId);
    if (!invoiceItem) {
        throw new AppError('Invoice item not found', 404);
    }
    return invoiceItem;
}

export async function getInvoiceItems(filters = {}) {
    const invoiceItems = await invoiceItemRepository.getInvoiceItems(filters);
    return invoiceItems || [];
}