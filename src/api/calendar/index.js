import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";

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

    const router = new Hono({ strict: false });

    const requireAuth = middleware.auth.requireAuth();
    const jsonBody = (validate) =>
        honoValidator("json", (body) => {
            validate(body);
            return body;
        });
    const idParam = honoValidator("param", (params) => ({
        id: validators.validateId(params.id),
    }));
    const importBody = jsonBody((body) => validators.validateBody(body));
    const createBody = jsonBody((body) => validators.validateCalendarCreateBatch(body));
    const updateBody = jsonBody((body) => validators.validateCalendarUpdate(body));

    router.get("/", async (c) => {
        const isAuthenticated = utils.isAuthenticated(c);

        const calendars = await models.calendar.getAllForAccess(isAuthenticated);

        return c.json({
            success: true,
            message: "Calendars retrieved successfully",
            errors: null,
            data: calendars,
        });
    });

    router.get("/export", requireAuth, async (c) => {
        const exportData = await services.calendar.export();

        return c.json({
            success: true,
            message: "Calendars exported successfully",
            errors: null,
            data: exportData,
        });
    });

    router.post("/import", requireAuth, importBody, async (c) => {
        const body = c.req.valid("json");

        const { calendars } = body;

        const results = await services.calendar.import(calendars, utils);

        return c.json({
            success: true,
            message: "Calendars imported successfully",
            errors: null,
            data: results,
        });
    });

    router.get("/:id", requireAuth, idParam, async (c) => {
        const { id } = c.req.valid("param");

        const calendar = await models.calendar.getById(id);

        if (!calendar) {
            throw new NotFoundError("Calendar");
        }

        return c.json({
            success: true,
            message: "Calendar retrieved successfully",
            errors: null,
            data: calendar,
        });
    });

    router.post("/", requireAuth, createBody, async (c) => {
        const body = c.req.valid("json");

        const { name, url, color } = body;

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
            ...body,
            name: sanitizedName,
            color: color || utils.generateRandomColor(),
        };

        const calendar = await services.calendar.create(calendarData);

        logger.info("calendar created", { name: calendar.name, id: calendar.id });

        return c.json(
            {
                success: true,
                message: "Calendar created successfully",
                errors: null,
                data: calendar,
            },
            201,
        );
    });

    router.put("/:id", requireAuth, idParam, updateBody, async (c) => {
        const { id } = c.req.valid("param");

        const calendar = await models.calendar.getById(id);

        if (!calendar) {
            throw new NotFoundError("Calendar");
        }

        const body = c.req.valid("json");
        const updateData = { ...body };

        if (updateData.name !== undefined) {
            updateData.name = utils.sanitizeString(updateData.name);
            if (utils.isEmpty(updateData.name)) {
                throw new ValidationError({
                    name: "Name cannot be empty after sanitization",
                });
            }
        }

        const updatedCalendar = await services.calendar.update(id, updateData);

        if (!updatedCalendar) {
            throw new NotFoundError("Calendar");
        }

        logger.info("calendar updated", { name: updatedCalendar.name, id: updatedCalendar.id });

        return c.json({
            success: true,
            message: "Calendar updated successfully",
            errors: null,
            data: updatedCalendar,
        });
    });

    router.delete("/:id", requireAuth, idParam, async (c) => {
        const { id } = c.req.valid("param");

        const calendar = await models.calendar.delete(id);

        if (!calendar) {
            throw new NotFoundError("Calendar");
        }

        logger.info("calendar deleted", { name: calendar.name, id: calendar.id });

        return c.json({
            success: true,
            message: "Calendar deleted successfully",
            errors: null,
            data: null,
        });
    });

    router.post("/refresh", requireAuth, async (c) => {
        logger.set({ trigger: "manual" });

        const result = await services.calendar.refetchAllCalendars();

        await services.cron.updateLastRun();

        return c.json({
            success: true,
            message: "Calendars refreshed successfully",
            errors: null,
            data: result,
        });
    });

    return router;
}
