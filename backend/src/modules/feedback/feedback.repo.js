import { prisma } from '../../config/db.js';

export async function createFeedback(data) {
    return await prisma.feedback.create({
        data: {
            encounterId: data.encounterId,
            question: data.question,
            rating: data.rating,
            comments: data.comment,
            submittedAt: data.submittedAt || new Date()
        }
    })
}

export async function updateFeedback(feedbackId, data) {
    return await prisma.feedback.update({
        where: { feedbackId: feedbackId },
        data: {
            question: data.question,
            rating: data.rating,
            comments: data.comment,
            submittedAt: data.submittedAt || new Date()
        }
    })
}

export async function deleteFeedback(feedbackId) {
    return await prisma.feedback.delete({
        where: { feedbackId: feedbackId }
    })
}

export async function getFeedbackById(feedbackId) {
    return await prisma.feedback.findUnique({
        where: { feedbackId: feedbackId }
    })
}

export async function getFeedbacks(filter) {
    const where = {};
    if (filter.encounterId) {
        where.encounterId = filter.encounterId;
    }
    if (filter.questionId) {
        where.questionId = filter.questionId;
    }
    return await prisma.feedback.findMany({ where });
}

