import express from 'express';

export function createCalendarRouter(dependencies = {}) {
    const { models, services, middleware, utils, logger, errors, validators } = dependencies;

    if (!models) throw new Error('Models required for calendar router');
    if (!services) throw new Error('Services required for calendar router');
    if (!middleware) throw new Error('Middleware required for calendar router');
    if (!utils) throw new Error('Utils required for calendar router');
    if (!logger) throw new Error('Logger required for calendar router');
    if (!errors) throw new Error('Errors required for calendar router');

    const { ValidationError, NotFoundError } = errors;

    const router = express.Router();

    const requireAuth = middleware.auth.requireAuth();

    router.get('/', async (req, res) => {
        const isAuthenticated = utils.isAuthenticated(req);

        const calendars = await models.calendar.getAllForAccess(isAuthenticated);

        res.json(calendars);
    });

    router.get('/:id', requireAuth, async (req, res) => {
        const id = validators.validateId(req.params.id);

        const calendar = await models.calendar.getById(id);

        if (!calendar) {
            throw new NotFoundError('Calendar');
        }

        res.json({ success: true, data: calendar });
    });

    router.post('/', requireAuth, async (req, res) => {
        validators.validateCalendarCreateBatch(req.body);

        const { name, url, color } = req.body;

        const sanitizedName = utils.sanitizeString(name);

        if (utils.isEmpty(sanitizedName)) {
            throw new ValidationError({ name: 'Calendar name cannot be empty after sanitization' });
        }

        const existingCalendar = await models.calendar.getByUrl(url);

        if (existingCalendar) {
            throw new ValidationError({ url: 'Calendar with this URL already exists' });
        }

        const calendarData = {
            ...req.body,
            name: sanitizedName,
            color: color || utils.generateRandomColor()
        };

        const calendar = await models.calendar.create(calendarData);

        logger.info(`Calendar created: ${calendar.name}`);

        if (process.env.NODE_ENV !== 'test') {
            setImmediate(async () => {
                try {
                    await services.calendar.fetchAndProcessCalendar(calendar.id, calendar.url);
                } catch (error) {
                    logger.error(`Background calendar fetch failed for ${calendar.id}:`, error);
                }
            });
        }

        res.status(201).json(calendar);
    });

    router.put('/:id', requireAuth, async (req, res) => {
        const id = validators.validateId(req.params.id);

        const calendar = await models.calendar.getById(id);

        if (!calendar) {
            throw new NotFoundError('Calendar');
        }

        const updateData = { ...req.body };

        if ('visible' in updateData) {
            updateData.hidden = !updateData.visible;
            delete updateData.visible;
        }

        validators.validateCalendarUpdate(updateData);

        if (updateData.name !== undefined) {
            updateData.name = utils.sanitizeString(updateData.name);
            if (utils.isEmpty(updateData.name)) {
                throw new ValidationError({ name: 'Name cannot be empty after sanitization' });
            }
        }

        const updatedCalendar = await models.calendar.update(id, updateData);

        if (!updatedCalendar) {
            throw new NotFoundError('Calendar');
        }

        if (updateData.hidden !== undefined || updateData.details !== undefined) {
            if (process.env.NODE_ENV !== 'test') {
                setImmediate(async () => {
                    try {
                        await services.calendar.fetchAndProcessCalendar(updatedCalendar.id, updatedCalendar.url);
                        logger.info(`Calendar events reprocessed for ${updatedCalendar.name}`);
                    } catch (error) {
                        logger.error(`Background calendar reprocessing failed for ${updatedCalendar.id}:`, error);
                    }
                });
            }
        }

        logger.info(`Calendar updated: ${updatedCalendar.name}`);

        res.json(updatedCalendar);
    });

    router.delete('/:id', requireAuth, async (req, res) => {
        const id = validators.validateId(req.params.id);

        const calendar = await models.calendar.delete(id);

        if (!calendar) {
            throw new NotFoundError('Calendar');
        }

        logger.info(`Calendar deleted: ${calendar.name}`);

        res.json(calendar);
    });

    router.post('/refetch', requireAuth, async (_req, res) => {
        logger.info('Calendar refetch requested');

        if (process.env.NODE_ENV !== 'test') {
            setImmediate(async () => {
                try {
                    await services.calendar.refetchAllCalendars();
                } catch (error) {
                    logger.error('Background refetch failed:', error);
                }
            });
        }

        res.json({ success: true, message: 'Calendar refetch initiated' });
    });

    return router;
}
