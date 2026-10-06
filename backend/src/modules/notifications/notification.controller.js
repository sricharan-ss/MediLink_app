import * as notificationService from './notification.service.js';
import { createNotificationSchema, updateNotificationSchema } from './notification.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createNotificationSchema.parse(req.body);
        const notification = await notificationService.createNotification(validatedData);
        res.status(201).json(notification);
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        const validatedData = updateNotificationSchema.parse(req.body);
        const notification = await notificationService.updateNotification(notificationId, validatedData);
        res.status(200).json(notification);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        const notification = await notificationService.getNotificationById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        const isAdmin = req.userRoles && (req.userRoles.includes('SUPER_ADMIN') || req.userRoles.includes('HOSPITAL_ADMIN'));
        if (!isAdmin && notification.userId !== req.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        await notificationService.deleteNotification(notificationId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        const notification = await notificationService.getNotificationById(notificationId);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        const isAdmin = req.userRoles && (req.userRoles.includes('SUPER_ADMIN') || req.userRoles.includes('HOSPITAL_ADMIN'));
        if (!isAdmin && notification.userId !== req.userId) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(200).json(notification);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { userId: queryUserId, type, isRead } = req.query;
        const isAdmin = req.userRoles && (req.userRoles.includes('SUPER_ADMIN') || req.userRoles.includes('HOSPITAL_ADMIN'));
        const effectiveUserId = isAdmin ? queryUserId : req.userId;
        const notifications = await notificationService.getNotifications({
            userId: effectiveUserId,
            type,
            isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined
        });
        res.status(200).json(notifications);
    } catch (err) {
        next(err);
    }
};