import * as deviceService from './device.service.js';
import { createDeviceSchema, updateDeviceSchema } from './device.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createDeviceSchema.parse(req.body);
        const device = await deviceService.create(validatedData);
        res.status(201).json(device);
    } catch(err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const deviceId = req.params.id;
        const validatedData = updateDeviceSchema.parse(req.body);
        const device = await deviceService.update(deviceId, validatedData);
        res.status(200).json(device);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const deviceId = req.params.id;
        await deviceService.deleteDevice(deviceId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const deviceId = req.params.id;
        const device = await deviceService.getDeviceById(deviceId);
        res.status(200).json(device);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { name, deviceType, manufacturer } = req.query;
        const devices = await deviceService.getDevices({ name, deviceType, manufacturer });
        res.status(200).json(devices);
    } catch (err) {
        next(err);
    }
};