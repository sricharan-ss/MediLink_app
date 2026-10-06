import * as reminderJobRepo from './reminder_job.repo.js';
import * as notificationRepo from '../notifications/notification.repo.js';
import { AppError } from '../../common/errors.js';

/**
 * Creates multiple reminder jobs for an encounter or lab schedule
 * Typically called when a new encounter/lab schedule is booked
 * @param {string} sourceType - 'ENCOUNTER' or 'LAB_SCHEDULE'
 * @param {string} sourceId - ID of the encounter or lab schedule
 * @param {string} userId - User to notify
 * @param {Date} scheduledTime - When the event is scheduled
 * @param {Array} reminders - Array of reminder config objects
 * @param {Object} payload - Contextual data for notification template rendering
 * @returns {Promise<Array>} Created reminder jobs
 */
export async function createRemindersForEvent(
  sourceType,
  sourceId,
  userId,
  scheduledTime,
  reminders,
  payload
) {
  try {
    const createdJobs = [];

    for (const reminder of reminders) {
      // Calculate when this reminder should fire
      const scheduledFor = new Date(scheduledTime.getTime() + reminder.offsetMinutes * 60000);
      
      // Create unique deduplication key to prevent duplicates
      const dedupeKey = `${sourceType}:${sourceId}:${reminder.offsetMinutes}M:${reminder.channel}`;

      const jobData = {
        sourceType,
        sourceId,
        userId,
        scheduledFor,
        channel: reminder.channel,
        templateKey: reminder.templateKey || `${sourceType}_REMINDER`,
        dedupeKey,
        payload,
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 5
      };

      const job = await reminderJobRepo.upsertReminderJob(jobData);
      createdJobs.push(job);
    }

    return createdJobs;
  } catch (error) {
    throw new AppError(`Failed to create reminders: ${error.message}`, 400);
  }
}

/**
 * Gets the next batch of reminder jobs to process
 * Called by the worker to fetch jobs that are due
 * @param {number} limit - Number of jobs to fetch
 * @returns {Promise<Array>} Array of due jobs with full user data included
 */
export async function getNextBatchOfReminders(limit = 100) {
  try {
    return await reminderJobRepo.getPendingDueJobs(limit);
  } catch (error) {
    throw new AppError(`Failed to fetch reminders for processing: ${error.message}`, 400);
  }
}

/**
 * Processes a single reminder job - sends notification and updates status
 * @param {Object} job - Reminder job object
 * @returns {Promise<Object>} Object with { success: boolean, message: string }
 */
export async function processReminderJob(job) {
  try {
    // Atomically claim the job to prevent duplicate sends if multiple workers running
    const claimed = await reminderJobRepo.claimJobForProcessing(job.jobId);
    
    if (!claimed) {
      // Another worker already claimed this job
      return { success: false, message: 'Job already being processed by another worker' };
    }

    try {
      // Send notification via notification service
      await sendReminderNotification(job);

      // Mark job as successfully sent
      await reminderJobRepo.markJobAsSent(job.jobId, job.attempts);
      
      return { success: true, message: 'Reminder sent successfully' };
    } catch (sendError) {
      // Notification failed - mark job as failed
      await reminderJobRepo.markJobAsFailed(
        job.jobId,
        sendError.message,
        job.attempts,
        job.maxAttempts
      );

      return { success: false, message: `Failed to send reminder: ${sendError.message}` };
    }
  } catch (error) {
    return { success: false, message: `Processing error: ${error.message}` };
  }
}

/**
 * Internal function to send the actual reminder notification
 * Formats message based on templateKey and sends via appropriate channel
 * @param {Object} job - Reminder job with user and payload
 */
async function sendReminderNotification(job) {
  // Build notification message based on template key
  const message = buildReminderMessage(job.templateKey, job.payload);
  const title = buildReminderTitle(job.templateKey);

  // Create notification record in database
  const notification = await notificationRepo.createNotification({
    userId: job.userId,
    title,
    message,
    type: getNotificationType(job.templateKey),
    relatedId: job.sourceId
  });

  // TODO: Send via actual channel (SMS, Email, WhatsApp, Push)
  // This would integrate with external services:
  // - SMS: Twilio, AWS SNS
  // - Email: SendGrid, AWS SES
  // - WhatsApp: WhatsApp Business API
  // - Push: Firebase Cloud Messaging
  // - In-App: Already stored in notification above
  
  if (job.channel === 'EMAIL') {
    // await emailService.send(job.user.email, title, message, job.payload);
    console.log(`[Email] To: ${job.user.email}, Subject: ${title}`);
  } else if (job.channel === 'SMS') {
    // await smsService.send(job.user.phoneNumber, message);
    console.log(`[SMS] To: ${job.user.phoneNumber}, Message: ${message}`);
  } else if (job.channel === 'WHATSAPP') {
    // await whatsappService.send(job.user.phoneNumber, message);
    console.log(`[WhatsApp] To: ${job.user.phoneNumber}, Message: ${message}`);
  } else if (job.channel === 'PUSH') {
    // await pushService.send(job.userId, title, message);
    console.log(`[Push] To: ${job.userId}, Title: ${title}`);
  }
  // IN_APP is handled by notification record created above

  return notification;
}

/**
 * Builds the message body for reminder notification
 * @param {string} templateKey - Template identifier
 * @param {Object} payload - Data for template rendering
 * @returns {string} Formatted message
 */
function buildReminderMessage(templateKey, payload = {}) {
  const messages = {
    'ENCOUNTER_REMINDER': () => {
      if (!payload.doctorName) return 'You have an upcoming appointment.';
      return `Reminder: You have an appointment with Dr. ${payload.doctorName} on ${formatDateTime(payload.appointmentTime)}${payload.locationDetails ? ` at ${payload.locationDetails}` : ''}.`;
    },
    'LAB_SCHEDULE_REMINDER': () => {
      if (!payload.testName) return 'You have a scheduled lab test.';
      return `Reminder: Your ${payload.testName} is scheduled for ${formatDateTime(payload.appointmentTime)}. Please arrive 15 minutes early.${payload.instructions ? ` ${payload.instructions}` : ''}`;
    },
    'LAB_TEST_REMINDER': () => {
      return buildReminderMessage('LAB_SCHEDULE_REMINDER', payload);
    }
  };

  const builder = messages[templateKey];
  if (builder) {
    return builder();
  }
  
  return 'You have a reminder. Please check the app for details.';
}

/**
 * Builds the title for reminder notification
 * @param {string} templateKey - Template identifier
 * @returns {string} Formatted title
 */
function buildReminderTitle(templateKey) {
  const titles = {
    'ENCOUNTER_REMINDER': 'Appointment Reminder',
    'LAB_SCHEDULE_REMINDER': 'Lab Test Reminder',
    'LAB_TEST_REMINDER': 'Lab Test Reminder'
  };

  return titles[templateKey] || 'Reminder';
}

/**
 * Maps template key to notification type for storage
 * @param {string} templateKey - Template identifier
 * @returns {string} NotificationType enum value
 */
function getNotificationType(templateKey) {
  const typeMap = {
    'ENCOUNTER_REMINDER': 'APPOINTMENT',
    'LAB_SCHEDULE_REMINDER': 'LAB',
    'LAB_TEST_REMINDER': 'LAB'
  };

  return typeMap[templateKey] || 'ALERT';
}

/**
 * Formats date and time for messages
 * @param {Date} dateTime - Date to format
 * @returns {string} Formatted date and time
 */
function formatDateTime(dateTime) {
  if (!dateTime) return 'a scheduled time';
  
  const date = new Date(dateTime);
  const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Cancels all reminders for a deleted encounter or lab schedule
 * Called when source entity is deleted
 * @param {string} sourceType - 'ENCOUNTER' or 'LAB_SCHEDULE'
 * @param {string} sourceId - ID of the source entity
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelRemindersForDeletedSource(sourceType, sourceId) {
  try {
    return await reminderJobRepo.cancelReminderJobsBySource(sourceType, sourceId);
  } catch (error) {
    throw new AppError(`Failed to cancel reminders: ${error.message}`, 400);
  }
}

/**
 * Handles jobs stuck in PROCESSING state
 * Resets them to PENDING for retry by worker
 * @param {number} timeoutMinutes - Consider stuck if in PROCESSING for this many minutes
 * @returns {Promise<number>} Number of jobs recovered
 */
export async function recoverStuckJobs(timeoutMinutes = 5) {
  try {
    const stuckJobs = await reminderJobRepo.getStuckJobs(timeoutMinutes);
    let recovered = 0;

    for (const job of stuckJobs) {
      try {
        await reminderJobRepo.updateReminderJob(job.jobId, {
          status: 'PENDING',
          lastError: `Previously stuck in PROCESSING for ${timeoutMinutes} mins, reset to PENDING`,
          updatedAt: new Date()
        });
        recovered++;
      } catch (error) {
        console.error(`Failed to recover stuck job ${job.jobId}:`, error.message);
      }
    }

    return recovered;
  } catch (error) {
    console.error('Error recovering stuck jobs:', error.message);
    return 0;
  }
}

/**
 * Gets reminder job statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getReminderStatistics() {
  try {
    // This would require aggregation queries in a real implementation
    // For now, returns a basic structure
    return {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      lastRunAt: new Date()
    };
  } catch (error) {
    console.error('Failed to fetch reminder statistics:', error.message);
    return null;
  }
}
