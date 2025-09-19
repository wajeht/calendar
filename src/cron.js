import cron from 'node-cron';

export function createCronService(dependencies = {}) {
    const { logger, services } = dependencies;

    if (!logger) throw new Error('Logger is required for cron service');
    if (!services?.calendar) throw new Error('Calendar service is required for cron service');

    let cronJobs = [];
    let isRefetchRunning = false;

    async function refetchCalendarsTask() {
        if (isRefetchRunning) {
            logger.warn('Calendar refetch already in progress, skipping');
            return;
        }

        isRefetchRunning = true;
        const startTime = Date.now();

        try {
            logger.info('Starting scheduled calendar refetch');
            const result = await services.calendar.refetchAllCalendars();
            const duration = Date.now() - startTime;

            logger.info(`Scheduled refetch completed in ${duration}ms - ${result.successful}/${result.total} calendars updated`);

            if (result.failed > 0) {
                logger.warn(`${result.failed} calendars failed to update`);
            }

        } catch (error) {
            logger.error('Scheduled calendar refetch failed:', error.message);
        } finally {
            isRefetchRunning = false;
        }
    }

    function start() {
        const schedule = '0 * * * *'; // Every hour
        if (!cron.validate(schedule)) {
            throw new Error(`Invalid cron schedule: ${schedule}`);
        }

        const calendarJob = cron.schedule(schedule, refetchCalendarsTask, {
            scheduled: false, // Don't start immediately
            timezone: 'UTC',
            name: 'calendar-refetch'
        });

        cronJobs.push(calendarJob);

        cronJobs.forEach(job => job.start());

        logger.info(`Cron service started with ${cronJobs.length} job(s)`);
    }

    function stop() {
        cronJobs.forEach(job => {
            if (job) {
                job.stop();
                job.destroy();
            }
        });
        cronJobs = [];
        logger.info('Cron service stopped');
    }

    return {
        start,
        stop
    };
}
