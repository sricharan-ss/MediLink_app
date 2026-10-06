import * as notificationRepository from './notification.repo.js';
import { AppError } from '../../common/errors.js';

export async function createNotification(data) {
    return await notificationRepository.createNotification(data);
}

export async function updateNotification(notificationId, data) {
    const notification = await notificationRepository.getNotificationById(notificationId);
    if (!notification) {
        throw new AppError('Notification not found', 404);
    }
    return await notificationRepository.updateNotification(notificationId, data);
}

export async function deleteNotification(notificationId) {
    const notification = await notificationRepository.getNotificationById(notificationId);
    if (!notification) {
        throw new AppError('Notification not found', 404);
    }
    return await notificationRepository.deleteNotification(notificationId);
}

export async function getNotificationById(notificationId) {
    const notification = await notificationRepository.getNotificationById(notificationId);
    if (!notification) {
        throw new AppError('Notification not found', 404);
    }
    return notification;
}

export async function getNotifications(filters = {}) {
    const notifications = await notificationRepository.getNotifications(filters);
    if (!notifications || notifications.length === 0) {
        return [];
    }
    return notifications;
}