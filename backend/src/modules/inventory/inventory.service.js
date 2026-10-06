import * as inventoryRepository from './inventory.repo.js';
import { AppError } from '../../common/errors.js';

export async function createInventoryItem(data) {
    if (data.inventoryId) {
        const inventory = await inventoryRepository.getInventoryItemById(data.inventoryId);
        if (inventory) {
            throw new AppError('Inventory item with this ID already exists', 409);
        }
    }
    return await inventoryRepository.createInventoryItem(data);
}

export async function updateInventoryItem(itemId, data) {
    const inventory = await inventoryRepository.getInventoryItemById(itemId);
    if (!inventory) {
        throw new AppError('Inventory item not found', 404);
    }
    return await inventoryRepository.updateInventoryItem(itemId, data);
}

export async function deleteInventoryItem(itemId) {
    const inventory = await inventoryRepository.getInventoryItemById(itemId);
    if (!inventory) {
        throw new AppError('Inventory item not found', 404);
    }
    return await inventoryRepository.deleteInventoryItem(itemId);
}

export async function getInventoryItemById(itemId) {
    const inventory = await inventoryRepository.getInventoryItemById(itemId);
    if (!inventory) {
        throw new AppError('Inventory item not found', 404);
    }
    return inventory;
}

export async function getInventoryItems(filters) {
    const inventory = await inventoryRepository.getInventoryItems(filters);
    return inventory || [];
}