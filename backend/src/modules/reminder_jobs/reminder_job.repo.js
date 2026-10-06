import { prisma } from '../../config/db.js';
import { AppError } from '../../common/errors.js';

/**
 * Creates a new reminder job
 * @param {Object} data - Reminder job data
 * @returns {Promise<Object>} Created reminder job
 */
export async function createReminderJob(data) {
  try {
    return await prisma.reminderJob.create({
      data: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        userId: data.userId,
        scheduledFor: data.scheduledFor,
        status: data.status || 'PENDING',
        attempts: data.attempts || 0,
        maxAttempts: data.maxAttempts || 5,
        channel: data.channel,
        templateKey: data.templateKey,
        dedupeKey: data.dedupeKey,
        payload: data.payload || null,
        lastError: data.lastError || null
      }
    });
  } catch (error) {
    throw new AppError(`Failed to create reminder job: ${error.message}`, 400);
  }
}

/**
 * Upserts a reminder job (creates if doesn't exist, updates if does)
 * Used to prevent duplicate reminders
 * @param {Object} data - Reminder job data with dedupeKey
 * @returns {Promise<Object>} Created or updated reminder job
 */
export async function upsertReminderJob(data) {
  try {
    return await prisma.reminderJob.upsert({
      where: { dedupeKey: data.dedupeKey },
      create: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        userId: data.userId,
        scheduledFor: data.scheduledFor,
        status: data.status || 'PENDING',
        attempts: data.attempts || 0,
        maxAttempts: data.maxAttempts || 5,
        channel: data.channel,
        templateKey: data.templateKey,
        dedupeKey: data.dedupeKey,
        payload: data.payload || null,
        lastError: data.lastError || null
      },
      update: {
        scheduledFor: data.scheduledFor,
        status: data.status || 'PENDING',
        payload: data.payload || undefined,
        lastError: data.lastError || undefined
      }
    });
  } catch (error) {
    throw new AppError(`Failed to upsert reminder job: ${error.message}`, 400);
  }
}

/**
 * Gets a reminder job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Reminder job or null
 */
export async function getReminderJobById(jobId) {
  try {
    return await prisma.reminderJob.findUnique({
      where: { jobId },
      include: { user: true }
    });
  } catch (error) {
    throw new AppError(`Failed to fetch reminder job: ${error.message}`, 400);
  }
}

/**
 * Gets pending reminder jobs that are due to be processed
 * @param {number} limit - Number of jobs to return
 * @returns {Promise<Array>} Array of due reminder jobs
 */
export async function getPendingDueJobs(limit = 100) {
  try {
    return await prisma.reminderJob.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date()
        }
      },
      take: limit,
      include: {
        user: true
      },
      orderBy: {
        scheduledFor: 'asc'
      }
    });
  } catch (error) {
    throw new AppError(`Failed to fetch pending jobs: ${error.message}`, 400);
  }
}

/**
 * Gets all reminder jobs for a specific source
 * @param {string} sourceType - ENCOUNTER or LAB_SCHEDULE
 * @param {string} sourceId - ID of the source entity
 * @returns {Promise<Array>} Array of reminder jobs
 */
export async function getReminderJobsBySource(sourceType, sourceId) {
  try {
    return await prisma.reminderJob.findMany({
      where: {
        sourceType,
        sourceId
      }
    });
  } catch (error) {
    throw new AppError(`Failed to fetch reminder jobs for source: ${error.message}`, 400);
  }
}

/**
 * Updates a reminder job status
 * Atomic operation - only updates if status matches expected value (prevents race conditions)
 * @param {string} jobId - Job ID
 * @param {string} currentStatus - Expected current status
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated job
 */
export async function updateReminderJobWithStatusCheck(jobId, currentStatus, updateData) {
  try {
    const result = await prisma.reminderJob.update({
      where: {
        jobId,
        status: currentStatus
      },
      data: updateData
    });
    return result;
  } catch (error) {
    // If update fails due to status mismatch, return null
    if (error.code === 'P2025') {
      return null;
    }
    throw new AppError(`Failed to update reminder job: ${error.message}`, 400);
  }
}

/**
 * Updates a reminder job
 * @param {string} jobId - Job ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} Updated job
 */
export async function updateReminderJob(jobId, data) {
  try {
    return await prisma.reminderJob.update({
      where: { jobId },
      data
    });
  } catch (error) {
    throw new AppError(`Failed to update reminder job: ${error.message}`, 400);
  }
}

/**
 * Atomically marks a job as PROCESSING to prevent duplicate sends
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Updated job or null if already being processed
 */
export async function claimJobForProcessing(jobId) {
  return updateReminderJobWithStatusCheck(jobId, 'PENDING', {
    status: 'PROCESSING',
    updatedAt: new Date()
  });
}

/**
 * Marks job as sent with timestamp
 * @param {string} jobId - Job ID
 * @param {number} attempts - Number of attempts made
 * @returns {Promise<Object>} Updated job
 */
export async function markJobAsSent(jobId, attempts) {
  return updateReminderJob(jobId, {
    status: 'SENT',
    notifyAt: new Date(),
    attempts: attempts + 1,
    updatedAt: new Date()
  });
}

/**
 * Marks job as failed with error message
 * @param {string} jobId - Job ID
 * @param {string} errorMessage - Error message
 * @param {number} attempts - Number of attempts made
 * @param {number} maxAttempts - Max allowed attempts
 * @returns {Promise<Object>} Updated job
 */
export async function markJobAsFailed(jobId, errorMessage, attempts, maxAttempts) {
  const newStatus = attempts + 1 >= maxAttempts ? 'FAILED' : 'FAILED';
  
  return updateReminderJob(jobId, {
    status: newStatus,
    lastError: errorMessage,
    attempts: attempts + 1,
    updatedAt: new Date()
  });
}

/**
 * Cancels reminder jobs for a specific source
 * Called when source entity (encounter/lab schedule) is deleted
 * @param {string} sourceType - ENCOUNTER or LAB_SCHEDULE
 * @param {string} sourceId - ID of the source entity
 * @returns {Promise<Object>} Update result
 */
export async function cancelReminderJobsBySource(sourceType, sourceId) {
  try {
    return await prisma.reminderJob.updateMany({
      where: {
        sourceType,
        sourceId,
        status: {
          in: ['PENDING', 'FAILED']
        }
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });
  } catch (error) {
    throw new AppError(`Failed to cancel reminder jobs: ${error.message}`, 400);
  }
}

/**
 * Deletes a reminder job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Deleted job
 */
export async function deleteReminderJob(jobId) {
  try {
    return await prisma.reminderJob.delete({
      where: { jobId }
    });
  } catch (error) {
    throw new AppError(`Failed to delete reminder job: ${error.message}`, 400);
  }
}

/**
 * Gets failed jobs that could be retried
 * @param {number} limit - Number of jobs to return
 * @returns {Promise<Array>} Array of failed jobs eligible for retry
 */
export async function getFailedJobsForRetry(limit = 50) {
  try {
    return await prisma.reminderJob.findMany({
      where: {
        status: 'FAILED',
        attempts: {
          lt: prisma.reminderJob.fields.maxAttempts // Reusing maxAttempts is not possible this way
        }
      },
      take: limit,
      include: { user: true },
      orderBy: {
        updatedAt: 'asc'
      }
    });
  } catch (error) {
    throw new AppError(`Failed to fetch failed jobs: ${error.message}`, 400);
  }
}

/**
 * Gets jobs stuck in PROCESSING state (likely worker crashed)
 * @param {number} timeoutMinutes - Consider stuck if in PROCESSING for this many minutes
 * @returns {Promise<Array>} Array of stuck jobs
 */
export async function getStuckJobs(timeoutMinutes = 5) {
  try {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    return await prisma.reminderJob.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: {
          lt: cutoffTime
        }
      },
      include: { user: true }
    });
  } catch (error) {
    throw new AppError(`Failed to fetch stuck jobs: ${error.message}`, 400);
  }
}
