import express from "express";

export function createCronRouter(dependencies = {}) {
    const { services, middleware, utils, logger, errors, validators } = dependencies;

    if (!services) throw new Error("Services required for cron router");
    if (!middleware) throw new Error("Middleware required for cron router");
    if (!utils) throw new Error("Utils required for cron router");
    if (!logger) throw new Error("Logger required for cron router");
    if (!errors) throw new Error("Errors required for cron router");
    if (!validators) throw new Error("Validators required for cron router");

    const { ValidationError } = errors;

    const router = express.Router();

    const requireAuth = middleware.auth.requireAuth();

    router.get("/status", requireAuth, async (_req, res) => {
        const status = services.cron.getStatus();
        res.json(status);
    });

    router.put("/settings", requireAuth, async (req, res) => {
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

        res.json(result);
    });

    return router;
}
