import * as inventoryManagerService from './inventory_manager.service.js';
import { createInventoryManagerSchema, updateInventoryManagerSchema } from './inventory_manager.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createInventoryManagerSchema.parse(req.body);
        const inventoryManager = await inventoryManagerService.createInventoryManager(validatedData);
        res.status(201).json(inventoryManager);
    }
    catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const inventoryManagerId = req.params.id;
        const validatedData = updateInventoryManagerSchema.parse(req.body);
        const inventoryManager = await inventoryManagerService.updateInventoryManager(inventoryManagerId, validatedData);
        res.status(200).json(inventoryManager);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const inventoryManagerId = req.params.id;
        await inventoryManagerService.deleteInventoryManager(inventoryManagerId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const inventoryManagerId = req.params.id;
        const inventoryManager = await inventoryManagerService.getInventoryManagerById(inventoryManagerId);
        res.status(200).json(inventoryManager);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { userId, hospitalId } = req.query;
        const inventoryManagers = await inventoryManagerService.getInventoryManagers({ userId, hospitalId });
        res.status(200).json(inventoryManagers);
    } catch (err) {
        next(err);
    }
};

