import * as reminderJobService from '../modules/reminder_jobs/reminder_job.service.js';
import logger from '../config/logger.js';

/**
 * Main worker function that processes reminder jobs
 * Called by the scheduler every minute
 */
export async function processReminders() {
  const startTime = Date.now();
  logger.info('[ReminderWorker] Starting reminder processing cycle');

  try {
    // Get next batch of pending reminders that are due
    const dueJobs = await reminderJobService.getNextBatchOfReminders(100);
    
    if (dueJobs.length === 0) {
      logger.info('[ReminderWorker] No due reminders found');
      return { processed: 0, success: 0, failed: 0 };
    }

    logger.info(`[ReminderWorker] Found ${dueJobs.length} due reminders to process`);

    let successCount = 0;
    let failedCount = 0;

    // Process each job
    for (const job of dueJobs) {
      try {
        const result = await reminderJobService.processReminderJob(job);
        
        if (result.success) {
          successCount++;
          logger.info(`[ReminderWorker] Job ${job.jobId} processed successfully: ${result.message}`);
        } else {
          failedCount++;
          logger.warn(`[ReminderWorker] Job ${job.jobId} failed: ${result.message}`);
        }
      } catch (error) {
        failedCount++;
        logger.error(`[ReminderWorker] Error processing job ${job.jobId}:`, error);
      }
    }

    const elapsed = Date.now() - startTime;
    logger.info(`[ReminderWorker] Cycle complete: ${successCount} sent, ${failedCount} failed (${elapsed}ms)`);

    return {
      processed: dueJobs.length,
      success: successCount,
      failed: failedCount,
      elapsedMs: elapsed
    };
  } catch (error) {
    logger.error('[ReminderWorker] Error in reminder processing cycle:', error);
    return { processed: 0, success: 0, failed: 0, error: error.message };
  }
}

/**
 * Recovers jobs stuck in PROCESSING state
 * Should be called periodically (e.g., every 5 minutes)
 */
export async function recoverStuckJobs() {
  try {
    logger.info('[ReminderWorker] Checking for stuck jobs...');
    const recovered = await reminderJobService.recoverStuckJobs(5);
    
    if (recovered > 0) {
      logger.warn(`[ReminderWorker] Recovered ${recovered} stuck jobs`);
    } else {
      logger.info('[ReminderWorker] No stuck jobs found');
    }
    
    return recovered;
  } catch (error) {
    logger.error('[ReminderWorker] Error recovering stuck jobs:', error);
    return 0;
  }
}

/**
 * Starts the reminder worker with scheduling
 * Runs processReminders every 60 seconds
 * Runs recoverStuckJobs every 5 minutes
 */
export function startReminderWorker() {
  logger.info('[ReminderWorker] Starting reminder worker service...');

  // Process reminders every 60 seconds
  const reminderInterval = setInterval(async () => {
    await processReminders();
  }, 60 * 1000);

  // Recover stuck jobs every 5 minutes
  const recoveryInterval = setInterval(async () => {
    await recoverStuckJobs();
  }, 5 * 60 * 1000);

  // Run immediately on startup
  processReminders().catch(error => {
    logger.error('[ReminderWorker] Initial reminder processing failed:', error);
  });

  logger.info('[ReminderWorker] Reminder worker started successfully');
  logger.info('[ReminderWorker] - Processing cycle: Every 60 seconds');
  logger.info('[ReminderWorker] - Recovery cycle: Every 5 minutes');

  // Return cleanup function
  return () => {
    clearInterval(reminderInterval);
    clearInterval(recoveryInterval);
    logger.info('[ReminderWorker] Reminder worker stopped');
  };
}

/**
 * Stops the reminder worker
 * Not typically used unless doing graceful shutdown
 */
let stopWorker = null;

export function initializeWorker() {
  stopWorker = startReminderWorker();
  return stopWorker;
}

export function shutdownWorker() {
  if (stopWorker) {
    stopWorker();
    stopWorker = null;
  }
}

// Export for manual testing/debugging
export default {
  processReminders,
  recoverStuckJobs,
  startReminderWorker,
  initializeWorker,
  shutdownWorker
};
