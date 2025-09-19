import cron from "node-cron";

export function createCronService(dependencies = {}) {
    const { logger, services, models } = dependencies;

    if (!logger) throw new Error("Logger required for cron service");
    if (!services?.calendar) throw new Error("Calendar service required for cron service");
    if (!models?.settings) throw new Error("Settings model required for cron service");

    let cronJobs = [];
    let isRefetchRunning = false;
    let isEnabled = false;
    let currentSchedule = "0 * * * *"; // Default: every hour
    let lastRun = null;

    async function loadSettings() {
        try {
            const cronSettings = await models.settings.get("cron_settings");
            if (cronSettings) {
                isEnabled = cronSettings.enabled !== false; // Default to true if not set
                currentSchedule = cronSettings.schedule || "0 * * * *";
                lastRun = cronSettings.lastRun || null;
                logger.info(
                    `Loaded cron settings: enabled=${isEnabled}, schedule=${currentSchedule}`,
                );
            } else {
                isEnabled = true;
                await saveSettings();
                logger.info("Initialized default cron settings");
            }
        } catch (error) {
            logger.error("Failed to load cron settings from database:", error.message);
            isEnabled = true;
        }
    }

    async function saveSettings() {
        try {
            await models.settings.set("cron_settings", {
                enabled: isEnabled,
                schedule: currentSchedule,
                lastRun: lastRun,
            });
        } catch (error) {
            logger.error("Failed to save cron settings to database:", error.message);
        }
    }

    async function refetchCalendarsTask() {
        if (isRefetchRunning) {
            logger.warn("Calendar refetch already in progress, skipping");
            return;
        }

        isRefetchRunning = true;
        const startTime = Date.now();
        lastRun = new Date().toISOString();

        try {
            logger.info("Starting scheduled calendar refetch");
            const result = await services.calendar.refetchAllCalendars();
            const duration = Date.now() - startTime;

            logger.info(
                `Scheduled refetch completed in ${duration}ms - ${result.successful}/${result.total} calendars updated`,
            );

            if (result.failed > 0) {
                logger.warn(`${result.failed} calendars failed to update`);
            }

            await saveSettings();
        } catch (error) {
            logger.error("Scheduled calendar refetch failed:", error.message);
        } finally {
            isRefetchRunning = false;
        }
    }

    async function start() {
        await loadSettings();

        const schedule = currentSchedule;

        if (!cron.validate(schedule)) {
            throw new Error(`Invalid cron schedule: ${schedule}`);
        }

        const calendarJob = cron.schedule(schedule, refetchCalendarsTask, {
            scheduled: false,
            timezone: "UTC",
            name: "calendar-refetch",
        });

        cronJobs.push(calendarJob);

        if (isEnabled) {
            cronJobs.forEach((job) => job.start());
        }

        logger.info(`Cron service started with ${cronJobs.length} job(s), enabled: ${isEnabled}`);
    }

    function stop() {
        cronJobs.forEach((job) => {
            if (job) {
                job.stop();
                job.destroy();
            }
        });
        cronJobs = [];
        logger.info("Cron service stopped");
    }

    function getStatus() {
        return {
            enabled: isEnabled,
            schedule: currentSchedule,
            lastRun: lastRun,
            isRunning: isRefetchRunning,
            jobCount: cronJobs.length,
        };
    }

    async function updateSettings({ enabled, schedule }) {
        if (typeof enabled === "boolean") {
            isEnabled = enabled;
        }

        if (schedule && schedule !== currentSchedule) {
            if (!cron.validate(schedule)) {
                throw new Error(`Invalid cron schedule: ${schedule}`);
            }

            currentSchedule = schedule;

            if (cronJobs.length > 0) {
                cronJobs.forEach((job) => {
                    if (job) {
                        job.stop();
                        job.destroy();
                    }
                });
                cronJobs = [];

                const calendarJob = cron.schedule(currentSchedule, refetchCalendarsTask, {
                    scheduled: false,
                    timezone: "UTC",
                    name: "calendar-refetch",
                });

                cronJobs.push(calendarJob);

                logger.info(`Cron schedule updated to: ${currentSchedule}`);
            }
        }

        if (cronJobs.length > 0) {
            if (isEnabled) {
                cronJobs.forEach((job) => job.start());
                logger.info("Cron jobs started");
            } else {
                cronJobs.forEach((job) => job.stop());
                logger.info("Cron jobs stopped");
            }
        }

        await saveSettings();

        return getStatus();
    }

    async function updateLastRun() {
        lastRun = new Date().toISOString();
        await saveSettings();
    }

    return {
        start,
        stop,
        getStatus,
        updateSettings,
        updateLastRun,
    };
}
