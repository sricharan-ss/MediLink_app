import * as invoiceItemService from './invoice_item.service.js';
import { createInvoiceItemSchema, updateInvoiceItemSchema } from './invoice_item.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createInvoiceItemSchema.parse(req.body);
        const invoiceItem = await invoiceItemService.createInvoiceItem(validatedData);
        res.status(201).json(invoiceItem);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const invoiceItemId = req.params.id;
        const validatedData = updateInvoiceItemSchema.parse(req.body);
        const invoiceItem = await invoiceItemService.updateInvoiceItem(invoiceItemId, validatedData);
        res.status(200).json(invoiceItem);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const invoiceItemId = req.params.id;
        await invoiceItemService.deleteInvoiceItem(invoiceItemId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const invoiceItemId = req.params.id;
        const invoiceItem = await invoiceItemService.getInvoiceItemById(invoiceItemId);
        res.status(200).json(invoiceItem);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { invoiceId, itemType } = req.query;
        const invoiceItems = await invoiceItemService.getInvoiceItems({ invoiceId, itemType });
        res.status(200).json(invoiceItems);
    } catch (err) {
        next(err);
    }
};

