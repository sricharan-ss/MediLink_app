import * as inventoryService from './inventory.service.js';
import { createInventoryItemSchema, updateInventoryItemSchema } from './inventory.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createInventoryItemSchema.parse(req.body);
        const inventoryItem = await inventoryService.createInventoryItem(validatedData);
        res.status(201).json(inventoryItem);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const itemId = req.params.id;
        const validatedData = updateInventoryItemSchema.parse(req.body);
        const inventoryItem = await inventoryService.updateInventoryItem(itemId, validatedData);
        res.status(200).json(inventoryItem);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const itemId = req.params.id;
        await inventoryService.deleteInventoryItem(itemId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const itemId = req.params.id;
        const inventoryItem = await inventoryService.getInventoryItemById(itemId);
        res.status(200).json(inventoryItem);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { hospitalId, medicineId, batchNo, expiryDate } = req.query;
        const inventoryItems = await inventoryService.getInventoryItems({
            hospitalId,
            medicineId,
            batchNo,
            expiryDate
        });
        res.status(200).json(inventoryItems);
    } catch (err) {
        next(err);
    }
};

