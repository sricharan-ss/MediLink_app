import * as feedbackRepository from './feedback.repo.js';
import { AppError } from '../../common/errors.js';

export async function createFeedback(data) {
    if (data.feedbackId) {
        const feedback = await feedbackRepository.getFeedbackById(data.feedbackId);
        if (feedback) {
            throw new AppError('Feedback with this ID already exists', 409);
        }
    }
    return await feedbackRepository.createFeedback(data);
}

export async function updateFeedback(feedbackId, data) {
    const feedback = await feedbackRepository.getFeedbackById(feedbackId);
    if (!feedback) {
        throw new AppError('Feedback not found', 404);
    }
    return await feedbackRepository.updateFeedback(feedbackId, data);
}

export async function deleteFeedback(feedbackId) {
    const feedback = await feedbackRepository.getFeedbackById(feedbackId);
    if (!feedback) {
        throw new AppError('Feedback not found', 404);
    }
    return await feedbackRepository.deleteFeedback(feedbackId);
}

export async function getFeedbackById(feedbackId) {
    const feedback = await feedbackRepository.getFeedbackById(feedbackId);
    if (!feedback) {
        throw new AppError('Feedback not found', 404);
    }
    return feedback;
}

export async function getFeedbacks(filter={}) {
    const feedbacks = await feedbackRepository.getFeedbacks(filter);
    if (!feedbacks || feedbacks.length === 0) {
        throw new AppError('No feedbacks found for the given filters', 404);
    }
    return feedbacks;
}

