import { prisma } from '../../config/db.js';

export async function createNotification(data) {
    return await prisma.notification.create({
        data: {
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type,
            relatedId: data.relatedId,
            isRead: data.isRead || false,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })
}

export async function updateNotification(notificationId, data) {
    return await prisma.notification.update({
        where: { notificationId: notificationId },
        data: {
            title: data.title,
            message: data.message,
            type: data.type,
            relatedId: data.relatedId,
            isRead: data.isRead,
            updatedAt: new Date()
        }
    })
}

export async function deleteNotification(notificationId) {
    return await prisma.notification.delete({
        where: { notificationId: notificationId }
    })
}

export async function getNotificationById(notificationId) {
    return await prisma.notification.findUnique({
        where: { notificationId: notificationId }
    })
}

export async function getNotifications(filters = {}) {
    const where = {};

    if (filters.type) {
        where.type = filters.type;
    }

    if (filters.isRead !== undefined) {
        where.isRead = filters.isRead;
    }

    if (filters.relatedId) {
        where.relatedId = filters.relatedId;
    }

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.title) {
        where.title = filters.title;
    }

    return await prisma.notification.findMany({ where });
}

