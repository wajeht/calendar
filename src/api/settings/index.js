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

    router.put("/theme", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { theme } = req.body;

        if (!theme || !["light", "dark", "system"].includes(theme)) {
            throw new ValidationError({
                theme: "Theme must be 'light', 'dark', or 'system'",
            });
        }

        await models.settings.set("theme", theme);

        logger.info(`Theme updated: ${theme}`);

        res.json({
            success: true,
            message: "Theme updated successfully",
            errors: null,
            data: { theme },
        });
    });

    router.get("/feed-token", requireAuth, async (_req, res) => {
        let token = await models.settings.get("feed_token");

        if (!token) {
            token = utils.generateSecureToken(32);
            await models.settings.set("feed_token", token);
            logger.info("Feed token generated on first access");
        }

        const feedCalendars = (await models.settings.get("feed_calendars")) || [];

        res.json({
            success: true,
            message: "Feed token retrieved successfully",
            errors: null,
            data: {
                token,
                feedUrl: `/api/feed/${token}.ics`,
                calendars: feedCalendars,
            },
        });
    });

    router.post("/feed-token/regenerate", requireAuth, async (_req, res) => {
        const token = utils.generateSecureToken(32);
        await models.settings.set("feed_token", token);

        const feedCalendars = (await models.settings.get("feed_calendars")) || [];

        logger.info("Feed token regenerated");

        res.json({
            success: true,
            message: "Feed token regenerated successfully",
            errors: null,
            data: {
                token,
                feedUrl: `/api/feed/${token}.ics`,
                calendars: feedCalendars,
            },
        });
    });

    router.put("/feed-token/calendars", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { calendars } = req.body;

        if (!Array.isArray(calendars)) {
            throw new ValidationError({
                calendars: "Calendars must be an array of IDs",
            });
        }

        await models.settings.set("feed_calendars", calendars);

        logger.info(`Feed calendars updated: ${calendars.length} selected`);

        res.json({
            success: true,
            message: "Feed calendars updated successfully",
            errors: null,
            data: { calendars },
        });
    });

    return router;
}
