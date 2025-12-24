import express from "express";

export function createFeedRouter(dependencies = {}) {
    const { models, services, logger, errors } = dependencies;

    if (!errors) throw new Error("Errors required for feed router");
    const { ConfigurationError, NotFoundError } = errors;

    if (!logger) throw new ConfigurationError("Logger required for feed router");
    if (!models) throw new ConfigurationError("Models required for feed router");
    if (!services) throw new ConfigurationError("Services required for feed router");

    const router = express.Router();

    router.get("/:token.ics", async (req, res) => {
        const { token } = req.params;

        const storedToken = await models.settings.get("feed_token");

        if (!storedToken || token !== storedToken) {
            throw new NotFoundError("Feed not found");
        }

        const allCalendars = await models.calendar.getAll();
        const selectedIds = (await models.settings.get("feed_calendars")) || [];

        const calendars =
            selectedIds.length === 0
                ? allCalendars
                : allCalendars.filter((c) => selectedIds.includes(c.id));

        const ical = services.calendar.combineCalendarsToIcal(calendars);

        logger.info("feed accessed", {
            calendar_count: calendars.length,
            selected_ids: selectedIds.length > 0 ? selectedIds : "all",
            ical_bytes: ical.length,
        });

        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="calendar.ics"');
        res.send(ical);
    });

    return router;
}
