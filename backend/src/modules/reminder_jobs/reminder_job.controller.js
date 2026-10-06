import * as reminderJobService from './reminder_job.service.js';
import * as reminderJobRepo from './reminder_job.repo.js';
import { AppError } from '../../common/errors.js';

/**
 * Creates a new reminder job
 * @route POST /api/reminder-jobs
 */
export async function createReminderJob(req, res, next) {
  try {
    const reminderJob = await reminderJobRepo.createReminderJob(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Reminder job created successfully',
      data: reminderJob
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates multiple reminders for an event (encounter or lab schedule)
 * @route POST /api/reminder-jobs/event
 */
export async function createRemindersForEvent(req, res, next) {
  try {
    const { sourceType, sourceId, userId, scheduledTime, reminders, payload } = req.body;
    
    const reminderJobs = await reminderJobService.createRemindersForEvent(
      sourceType,
      sourceId,
      userId,
      new Date(scheduledTime),
      reminders,
      payload
    );

    res.status(201).json({
      status: 'success',
      message: `${reminderJobs.length} reminder jobs created successfully`,
      count: reminderJobs.length,
      data: reminderJobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets a reminder job by ID
 * @route GET /api/reminder-jobs/:jobId
 */
export async function getReminderJobById(req, res, next) {
  try {
    const reminderJob = await reminderJobRepo.getReminderJobById(req.params.jobId);
    
    if (!reminderJob) {
      throw new AppError('Reminder job not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: reminderJob
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets reminder jobs by source
 * @route GET /api/reminder-jobs/source/:sourceType/:sourceId
 */
export async function getReminderJobsBySource(req, res, next) {
  try {
    const { sourceType, sourceId } = req.params;
    
    const reminderJobs = await reminderJobRepo.getReminderJobsBySource(sourceType, sourceId);

    res.status(200).json({
      status: 'success',
      count: reminderJobs.length,
      data: reminderJobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets pending due jobs
 * @route GET /api/reminder-jobs/pending
 */
export async function getPendingDueJobs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const reminderJobs = await reminderJobRepo.getPendingDueJobs(limit);

    res.status(200).json({
      status: 'success',
      count: reminderJobs.length,
      data: reminderJobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets next batch of reminders for worker processing
 * @route GET /api/reminder-jobs/batch
 */
export async function getNextBatchOfReminders(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const reminderJobs = await reminderJobService.getNextBatchOfReminders(limit);

    res.status(200).json({
      status: 'success',
      count: reminderJobs.length,
      data: reminderJobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a reminder job
 * @route PATCH /api/reminder-jobs/:jobId
 */
export async function updateReminderJob(req, res, next) {
  try {
    const reminderJob = await reminderJobRepo.updateReminderJob(req.params.jobId, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Reminder job updated successfully',
      data: reminderJob
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Processes a single reminder job (manual trigger)
 * @route POST /api/reminder-jobs/:jobId/process
 */
export async function processReminderJob(req, res, next) {
  try {
    const job = await reminderJobRepo.getReminderJobById(req.params.jobId);
    
    if (!job) {
      throw new AppError('Reminder job not found', 404);
    }

    const result = await reminderJobService.processReminderJob(job);

    res.status(200).json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      data: { jobId: job.jobId }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancels reminders for a deleted source
 * @route POST /api/reminder-jobs/cancel
 */
export async function cancelRemindersForSource(req, res, next) {
  try {
    const { sourceType, sourceId } = req.body;
    
    const result = await reminderJobService.cancelRemindersForDeletedSource(sourceType, sourceId);

    res.status(200).json({
      status: 'success',
      message: 'Reminder jobs cancelled successfully',
      data: { count: result.count }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a reminder job
 * @route DELETE /api/reminder-jobs/:jobId
 */
export async function deleteReminderJob(req, res, next) {
  try {
    await reminderJobRepo.deleteReminderJob(req.params.jobId);

    res.status(200).json({
      status: 'success',
      message: 'Reminder job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Recovers stuck jobs
 * @route POST /api/reminder-jobs/recover-stuck
 */
export async function recoverStuckJobs(req, res, next) {
  try {
    const timeoutMinutes = parseInt(req.body.timeoutMinutes) || 5;
    const recovered = await reminderJobService.recoverStuckJobs(timeoutMinutes);

    res.status(200).json({
      status: 'success',
      message: `${recovered} stuck jobs recovered`,
      data: { recovered }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets stuck jobs
 * @route GET /api/reminder-jobs/stuck
 */
export async function getStuckJobs(req, res, next) {
  try {
    const timeoutMinutes = parseInt(req.query.timeoutMinutes) || 5;
    const stuckJobs = await reminderJobRepo.getStuckJobs(timeoutMinutes);

    res.status(200).json({
      status: 'success',
      count: stuckJobs.length,
      data: stuckJobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets failed jobs eligible for retry
 * @route GET /api/reminder-jobs/failed
 */
export async function getFailedJobsForRetry(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const failedJobs = await reminderJobRepo.getFailedJobsForRetry(limit);

    res.status(200).json({
      status: 'success',
      count: failedJobs.length,
      data: failedJobs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets reminder statistics
 * @route GET /api/reminder-jobs/stats
 */
export async function getReminderStatistics(req, res, next) {
  try {
    const stats = await reminderJobService.getReminderStatistics();

    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    next(error);
  }
}
