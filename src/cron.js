import cron from "node-cron";

export function createCronService(dependencies = {}) {
    const { logger, services, models, errors } = dependencies;

    if (!errors) throw new Error("Errors required for cron service");
    const { ConfigurationError, ValidationError } = errors;

    if (!logger) throw new ConfigurationError("Logger required for cron service");
    if (!services?.calendar)
        throw new ConfigurationError("Calendar service required for cron service");
    if (!models?.settings) throw new ConfigurationError("Settings model required for cron service");

    let cronJobs = [];
    let isRefetchRunning = false;
    let isEnabled = false;
    let currentSchedule = "0 */1 * * *"; // Default: every hour
    let lastRun = null;

    async function loadSettings() {
        try {
            const cronSettings = await models.settings.get("cron_settings");
            if (cronSettings) {
                isEnabled = cronSettings.enabled !== false; // Default to true if not set
                currentSchedule = cronSettings.schedule || "0 */1 * * *";
                lastRun = cronSettings.lastRun || null;
                logger.info("loaded cron settings", {
                    enabled: isEnabled,
                    schedule: currentSchedule,
                });
            } else {
                isEnabled = true;
                await saveSettings();
                logger.info("initialized default cron settings");
            }
        } catch (error) {
            logger.error("failed to load cron settings", { error: error.message });
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
            logger.error("failed to save cron settings", { error: error.message });
        }
    }

    async function refetchCalendarsTask() {
        if (isRefetchRunning) {
            logger.warn("calendar refetch already in progress", { schedule: currentSchedule });
            return;
        }

        isRefetchRunning = true;
        const startTime = Date.now();
        lastRun = new Date().toISOString();

        try {
            const result = await services.calendar.refetchAllCalendars();

            logger.info("scheduled refetch complete", {
                trigger: "cron",
                schedule: currentSchedule,
                duration_ms: Date.now() - startTime,
                total: result.total,
                successful: result.successful,
                failed: result.failed,
            });

            await saveSettings();
        } catch (error) {
            logger.error("scheduled refetch failed", {
                trigger: "cron",
                schedule: currentSchedule,
                duration_ms: Date.now() - startTime,
                error: error.message,
                error_type: error.constructor.name,
            });
        } finally {
            isRefetchRunning = false;
        }
    }

    async function start() {
        await loadSettings();

        const schedule = currentSchedule;

        if (!cron.validate(schedule)) {
            throw new ValidationError({ schedule: `Invalid cron schedule: ${schedule}` });
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

        logger.info("cron service started", {
            job_count: cronJobs.length,
            enabled: isEnabled,
            schedule: currentSchedule,
        });
    }

    function stop() {
        cronJobs.forEach((job) => {
            if (job) {
                job.stop();
                job.destroy();
            }
        });
        cronJobs = [];
        logger.info("cron service stopped");
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
                throw new ValidationError({ schedule: `Invalid cron schedule: ${schedule}` });
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

                logger.info("cron schedule updated", {
                    schedule: currentSchedule,
                    enabled: isEnabled,
                });
            }
        }

        if (cronJobs.length > 0) {
            if (isEnabled) {
                cronJobs.forEach((job) => job.start());
            } else {
                cronJobs.forEach((job) => job.stop());
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
        stop,
        start,
        getStatus,
        updateSettings,
        updateLastRun,
    };
}
