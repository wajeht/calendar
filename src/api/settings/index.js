import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";

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

    const router = new Hono({ strict: false });

    const requireAuth = middleware.auth.requireAuth();
    const jsonBody = (validate) =>
        honoValidator("json", (body) => {
            validate(body);
            return body;
        });

    const cronBody = jsonBody((body) => {
        validators.validateBody(body);

        const { enabled, schedule } = body;

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
    });

    const themeBody = jsonBody((body) => {
        validators.validateBody(body);

        const { theme } = body;

        if (!theme || !["light", "dark", "system"].includes(theme)) {
            throw new ValidationError({
                theme: "Theme must be 'light', 'dark', or 'system'",
            });
        }
    });

    const feedCalendarsBody = jsonBody((body) => {
        validators.validateBody(body);

        if (!Array.isArray(body.calendars)) {
            throw new ValidationError({
                calendars: "Calendars must be an array of IDs",
            });
        }
    });

    router.get("/cron", requireAuth, async (c) => {
        const status = services.cron.getStatus();
        return c.json({
            success: true,
            message: "Cron settings retrieved successfully",
            errors: null,
            data: status,
        });
    });

    router.put("/cron", requireAuth, cronBody, async (c) => {
        const { enabled, schedule } = c.req.valid("json");

        const result = await services.cron.updateSettings({ enabled, schedule });

        logger.info("cron settings updated", { enabled, schedule });

        return c.json({
            success: true,
            message: "Cron settings updated successfully",
            errors: null,
            data: result,
        });
    });

    router.put("/theme", requireAuth, themeBody, async (c) => {
        const { theme } = c.req.valid("json");

        await models.settings.set("theme", theme);

        logger.info("theme updated", { theme });

        return c.json({
            success: true,
            message: "Theme updated successfully",
            errors: null,
            data: { theme },
        });
    });

    router.get("/feed-token", requireAuth, async (c) => {
        const token = await models.settings.get("feed_token");

        if (!token) {
            return c.json({
                success: true,
                message: "No feed token configured",
                errors: null,
                data: null,
            });
        }

        const feedCalendars = (await models.settings.get("feed_calendars")) || [];

        return c.json({
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

    router.post("/feed-token/regenerate", requireAuth, async (c) => {
        const token = utils.generateSecureToken(48);
        await models.settings.set("feed_token", token);

        const feedCalendars = (await models.settings.get("feed_calendars")) || [];

        logger.info("feed token regenerated");

        return c.json({
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

    router.put("/feed-token/calendars", requireAuth, feedCalendarsBody, async (c) => {
        const { calendars } = c.req.valid("json");

        await models.settings.set("feed_calendars", calendars);

        logger.info("feed calendars updated", {
            calendar_count: calendars.length,
            calendar_ids: calendars,
        });

        return c.json({
            success: true,
            message: "Feed calendars updated successfully",
            errors: null,
            data: { calendars },
        });
    });

    return router;
}
