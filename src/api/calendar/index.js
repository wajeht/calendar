import express from "express";

const pendingFetches = new Set();

export function createCalendarRouter(dependencies = {}) {
    const { models, services, middleware, utils, logger, errors, validators } = dependencies;

    if (!errors) throw new Error("Errors required for calendar router");
    const { ConfigurationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for calendar router");
    if (!logger) throw new ConfigurationError("Logger required for calendar router");
    if (!models) throw new ConfigurationError("Models required for calendar router");
    if (!services) throw new ConfigurationError("Services required for calendar router");
    if (!middleware) throw new ConfigurationError("Middleware required for calendar router");

    const { ValidationError, NotFoundError } = errors;

    const router = express.Router();

    const requireAuth = middleware.auth.requireAuth();

    router.get("/", async (req, res) => {
        const isAuthenticated = utils.isAuthenticated(req);

        const calendars = await models.calendar.getAllForAccess(isAuthenticated);

        res.json({
            success: true,
            message: "Calendars retrieved successfully",
            errors: null,
            data: calendars,
        });
    });

    router.get("/export", requireAuth, async (_req, res) => {
        const exportData = await services.calendar.exportCalendars();

        res.json({
            success: true,
            message: "Calendars exported successfully",
            errors: null,
            data: exportData,
        });
    });

    router.post("/import", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { calendars } = req.body;

        const results = await services.calendar.importCalendars(calendars, utils);

        res.json({
            success: true,
            message: "Calendars imported successfully",
            errors: null,
            data: results,
        });
    });

    router.get("/:id", requireAuth, async (req, res) => {
        const id = validators.validateId(req.params.id);

        const calendar = await models.calendar.getById(id);

        if (!calendar) {
            throw new NotFoundError("Calendar");
        }

        res.json({
            success: true,
            message: "Calendar retrieved successfully",
            errors: null,
            data: calendar,
        });
    });

    router.post("/", requireAuth, async (req, res) => {
        validators.validateCalendarCreateBatch(req.body);

        const { name, url, color } = req.body;

        const sanitizedName = utils.sanitizeString(name);

        if (utils.isEmpty(sanitizedName)) {
            throw new ValidationError({
                name: "Calendar name cannot be empty after sanitization",
            });
        }

        const existingCalendar = await models.calendar.getByUrl(url);

        if (existingCalendar) {
            throw new ValidationError({
                url: "Calendar with this URL already exists",
            });
        }

        const calendarData = {
            ...req.body,
            name: sanitizedName,
            color: color || utils.generateRandomColor(),
        };

        const calendar = await models.calendar.create(calendarData);

        logger.info("calendar created", { name: calendar.name, id: calendar.id });

        if (process.env.NODE_ENV !== "test" && !pendingFetches.has(calendar.id)) {
            pendingFetches.add(calendar.id);
            setImmediate(async () => {
                try {
                    await services.calendar.fetchAndProcessCalendar(calendar.id, calendar.url);
                } catch (error) {
                    logger.error("background calendar fetch failed", {
                        calendar_id: calendar.id,
                        error: error.message,
                    });
                } finally {
                    pendingFetches.delete(calendar.id);
                }
            });
        }

        res.status(201).json({
            success: true,
            message: "Calendar created successfully",
            errors: null,
            data: calendar,
        });
    });

    router.put("/:id", requireAuth, async (req, res) => {
        const id = validators.validateId(req.params.id);

        const calendar = await models.calendar.getById(id);

        if (!calendar) {
            throw new NotFoundError("Calendar");
        }

        const updateData = { ...req.body };

        validators.validateCalendarUpdate(updateData);

        if (updateData.name !== undefined) {
            updateData.name = utils.sanitizeString(updateData.name);
            if (utils.isEmpty(updateData.name)) {
                throw new ValidationError({
                    name: "Name cannot be empty after sanitization",
                });
            }
        }

        const updatedCalendar = await models.calendar.update(id, updateData);

        if (!updatedCalendar) {
            throw new NotFoundError("Calendar");
        }

        if (
            updateData.visible_to_public !== undefined ||
            updateData.show_details_to_public !== undefined
        ) {
            if (process.env.NODE_ENV !== "test" && !pendingFetches.has(updatedCalendar.id)) {
                pendingFetches.add(updatedCalendar.id);
                setImmediate(async () => {
                    try {
                        await services.calendar.fetchAndProcessCalendar(
                            updatedCalendar.id,
                            updatedCalendar.url,
                        );
                        logger.info("calendar events reprocessed", {
                            name: updatedCalendar.name,
                            id: updatedCalendar.id,
                        });
                    } catch (error) {
                        logger.error("background calendar reprocessing failed", {
                            calendar_id: updatedCalendar.id,
                            error: error.message,
                        });
                    } finally {
                        pendingFetches.delete(updatedCalendar.id);
                    }
                });
            }
        }

        logger.info("calendar updated", { name: updatedCalendar.name, id: updatedCalendar.id });

        res.json({
            success: true,
            message: "Calendar updated successfully",
            errors: null,
            data: updatedCalendar,
        });
    });

    router.delete("/:id", requireAuth, async (req, res) => {
        const id = validators.validateId(req.params.id);

        const calendar = await models.calendar.delete(id);

        if (!calendar) {
            throw new NotFoundError("Calendar");
        }

        logger.info("calendar deleted", { name: calendar.name, id: calendar.id });

        res.json({
            success: true,
            message: "Calendar deleted successfully",
            errors: null,
            data: null,
        });
    });

    router.post("/refresh", requireAuth, async (_req, res) => {
        logger.set({ trigger: "manual" });

        const result = await services.calendar.refetchAllCalendars();

        await services.cron.updateLastRun();

        res.json({
            success: true,
            message: "Calendars refreshed successfully",
            errors: null,
            data: result,
        });
    });

    return router;
}
