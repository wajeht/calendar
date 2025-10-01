import express from "express";

export function createSettingsRouter(dependencies = {}) {
    const { services, middleware, utils, logger, errors, validators, models } = dependencies;

    if (!errors) throw new Error("Errors required for settings router");
    const { ConfigurationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for settings router");
    if (!logger) throw new ConfigurationError("Logger required for settings router");
    if (!models) throw new ConfigurationError("Models required for settings router");
    if (!services) throw new ConfigurationError("Services required for settings router");
    if (!validators) throw new ConfigurationError("Validators required for settings router");
    if (!middleware) throw new ConfigurationError("Middleware required for settings router");

    const { ValidationError } = errors;

    const router = express.Router();

    const requireAuth = middleware.auth.requireAuth();

    router.get("/cron", requireAuth, async (_req, res) => {
        const status = services.cron.getStatus();
        res.json({
            success: true,
            message: "Cron settings retrieved successfully",
            errors: null,
            data: status,
        });
    });

    router.put("/cron", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { enabled, schedule } = req.body;

        if (typeof enabled !== "boolean") {
            throw new ValidationError({
                enabled: "Enabled must be a boolean value",
            });
        }

        if (enabled && (!schedule || typeof schedule !== "string")) {
            throw new ValidationError({
                schedule: "Schedule is required when enabling cron",
            });
        }

        if (schedule) {
            const cronParts = schedule.split(" ");
            if (cronParts.length !== 5) {
                throw new ValidationError({
                    schedule:
                        "Invalid cron schedule format. Expected 5 parts (minute hour day month weekday)",
                });
            }
        }

        const result = await services.cron.updateSettings({ enabled, schedule });

        logger.info(`Cron settings updated: enabled=${enabled}, schedule=${schedule}`);

        res.json({
            success: true,
            message: "Cron settings updated successfully",
            errors: null,
            data: result,
        });
    });

    router.get("/notifications", requireAuth, async (_req, res) => {
        const enabled = (await models.settings.get("notifications_enabled")) || false;
        const leadTime = (await models.settings.get("notification_lead_time")) || 5;

        res.json({
            success: true,
            message: "Notification settings retrieved successfully",
            errors: null,
            data: {
                enabled,
                leadTime,
            },
        });
    });

    router.put("/notifications", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { enabled, leadTime } = req.body;

        if (typeof enabled !== "boolean") {
            throw new ValidationError({
                enabled: "Enabled must be a boolean value",
            });
        }

        if (leadTime !== undefined) {
            if (typeof leadTime !== "number" || leadTime < 1 || leadTime > 60) {
                throw new ValidationError({
                    leadTime: "Lead time must be a number between 1 and 60 minutes",
                });
            }
        }

        await models.settings.set("notifications_enabled", enabled);
        if (leadTime !== undefined) {
            await models.settings.set("notification_lead_time", leadTime);
        }

        logger.info(`Notification settings updated: enabled=${enabled}, leadTime=${leadTime || 5}`);

        res.json({
            success: true,
            message: "Notification settings updated successfully",
            errors: null,
            data: {
                enabled,
                leadTime: leadTime !== undefined ? leadTime : 5,
            },
        });
    });

    return router;
}
