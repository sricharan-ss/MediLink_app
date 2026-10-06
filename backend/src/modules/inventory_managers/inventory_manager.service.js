import * as inventoryManagerRepository from './inventory_manager.repo.js';
import { AppError } from '../../common/errors.js';

export async function createInventoryManager(data) {
    const existingInventoryManagers = await inventoryManagerRepository.getInventoryManagers({
        userId: data.userId
    });
    if (existingInventoryManagers && existingInventoryManagers.length > 0) {
        throw new AppError('Inventory Manager already exists', 409);
    }
    return await inventoryManagerRepository.createInventoryManager(data);
}

export async function updateInventoryManager(inventoryManagerId, data) {
    const inventoryManager = await inventoryManagerRepository.getInventoryManagerById(inventoryManagerId);
    if (!inventoryManager) {
        throw new AppError('Inventory Manager not found', 404);
    }
    return await inventoryManagerRepository.updateInventoryManager(inventoryManagerId, data);
}

export async function deleteInventoryManager(inventoryManagerId) {
    const inventoryManager = await inventoryManagerRepository.getInventoryManagerById(inventoryManagerId);
    if (!inventoryManager) {
        throw new AppError('Inventory Manager not found', 404);
    }
    return await inventoryManagerRepository.deleteInventoryManager(inventoryManagerId);
}

export async function getInventoryManagerById(inventoryManagerId) {
    const inventoryManager = await inventoryManagerRepository.getInventoryManagerById(inventoryManagerId);
    if (!inventoryManager) {
        throw new AppError('Inventory Manager not found', 404);
    }
    return inventoryManager;
}

export async function getInventoryManagers(filters = {}) {
    const inventoryManagers = await inventoryManagerRepository.getInventoryManagers(filters);
    if (!inventoryManagers || inventoryManagers.length === 0) {
        throw new AppError('No Inventory Managers found for the given filters', 404);
    }
    return inventoryManagers;
}
