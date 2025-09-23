import express from "express";

export function createSettingsRouter(dependencies = {}) {
    const { services, middleware, utils, logger, errors, validators, models } = dependencies;

    if (!services) throw new Error("Services required for settings router");
    if (!middleware) throw new Error("Middleware required for settings router");
    if (!utils) throw new Error("Utils required for settings router");
    if (!logger) throw new Error("Logger required for settings router");
    if (!errors) throw new Error("Errors required for settings router");
    if (!validators) throw new Error("Validators required for settings router");
    if (!models) throw new Error("Models required for settings router");

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

    return router;
}
