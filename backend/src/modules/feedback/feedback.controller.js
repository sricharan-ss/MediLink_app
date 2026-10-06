import * as feedbackService from './feedback.service.js';
import { createFeedbackSchema, updateFeedbackSchema } from './feedback.validator.js';

export const create = async (req, res, next) => {
    try {
        const validatedData = createFeedbackSchema.parse(req.body);
        const feedback = await feedbackService.createFeedback(validatedData);
        res.status(201).json(feedback);
    } catch(err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const feedbackId = req.params.id;
        const validatedData = updateFeedbackSchema.parse(req.body);
        const feedback = await feedbackService.updateFeedback(feedbackId, validatedData);
        res.status(200).json(feedback);
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const feedbackId = req.params.id;
        await feedbackService.deleteFeedback(feedbackId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        const feedbackId = req.params.id;
        const feedback = await feedbackService.getFeedbackById(feedbackId);
        res.status(200).json(feedback);
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const { hospitalId, doctorId, patientId, userId } = req.query;
        const feedbacks = await feedbackService.getFeedbacks({
            hospitalId,
            doctorId,
            patientId,
            userId
        });
        res.status(200).json(feedbacks);
    }
    catch (err) {
        next(err);
    }
};