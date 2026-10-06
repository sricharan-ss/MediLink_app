import * as deviceRepository from './device.repo.js';
import { AppError } from '../../common/errors.js';

export async function create(data) {
    if (data.deviceId) {
        const device = await deviceRepository.getDeviceById(data.deviceId);
        if (device) {
            throw new AppError('Device with this ID already exists', 400);
        }
    }
    return await deviceRepository.createDevice(data);
}

export async function update(deviceId, data) {
    const device = await deviceRepository.getDeviceById(deviceId);
    if (!device) {
        throw new AppError('Device not found', 404);
    }
    return await deviceRepository.updateDevice(deviceId, data);
}

export async function deleteDevice(deviceId) {
    const device = await deviceRepository.getDeviceById(deviceId);
    if (!device) {
        throw new AppError('Device not found', 404);
    }
    return await deviceRepository.deleteDevice(deviceId);
}

export async function getDeviceById(deviceId) {
    const device = await deviceRepository.getDeviceById(deviceId);
    if (!device) {
        throw new AppError('Device not found', 404);
    }
    return device;
}

export async function getDevices(filters={}) {
    const devices = await deviceRepository.getAllDevices(filters);
    if (!devices || devices.length === 0) {
        throw new AppError('No devices found', 404);
    }
    return devices;
}

