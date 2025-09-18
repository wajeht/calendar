import express from 'express';

export function createCalendarRouter(dependencies = {}) {
    const { models, services, middleware, utils, logger } = dependencies;

    if (!models) throw new Error('Models required for calendar router');
    if (!services) throw new Error('Services required for calendar router');
    if (!middleware) throw new Error('Middleware required for calendar router');
    if (!utils) throw new Error('Utils required for calendar router');
    if (!logger) throw new Error('Logger required for calendar router');

    const router = express.Router();
    const verifyToken = middleware.auth.requireAuth();

    router.get('/', async (_req, res) => {
        try {
            const calendars = await models.calendar.getAll();
            res.json(calendars);
        } catch (error) {
            logger.error('Error fetching visible calendars:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.get('/:id', verifyToken, async (req, res) => {
        try {
            const calendar = await models.calendar.getById(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }
            res.json({ success: true, data: calendar });
        } catch (error) {
            logger.error('Error fetching calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.post('/', verifyToken, async (req, res) => {
        try {
            const { name, url, color } = req.body;

            if (utils.isEmpty(name) || utils.isEmpty(url)) {
                return res.status(400).json({ success: false, error: 'Name and URL are required' });
            }

            if (!utils.validateCalendarUrl(url)) {
                return res.status(400).json({ success: false, error: 'Invalid calendar URL' });
            }

            const sanitizedName = utils.sanitizeString(name);

            const existingCalendar = await models.calendar.getByUrl(url);
            if (existingCalendar) {
                return res.status(409).json({ success: false, error: 'Calendar with this URL already exists' });
            }

            const calendarData = {
                ...req.body,
                name: sanitizedName,
                color: color || utils.generateRandomColor()
            };

            const calendar = await models.calendar.create(calendarData);
            logger.info(`Calendar created: ${calendar.name}`);

            setImmediate(async () => {
                try {
                    await services.calendar.fetchAndProcessCalendar(calendar.id, calendar.url);
                } catch (error) {
                    logger.error(`Background calendar fetch failed for ${calendar.id}:`, error);
                }
            });

            res.status(201).json(calendar);
        } catch (error) {
            logger.error('Error creating calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.put('/:id', verifyToken, async (req, res) => {
        try {
            const calendar = await models.calendar.getById(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }

            const updateData = { ...req.body };

            if ('visible' in updateData) {
                updateData.hidden = !updateData.visible;
                delete updateData.visible;
            }

            if (updateData.name) {
                updateData.name = utils.sanitizeString(updateData.name);
                if (utils.isEmpty(updateData.name)) {
                    return res.status(400).json({ success: false, error: 'Name cannot be empty' });
                }
            }

            if (updateData.url && !utils.validateCalendarUrl(updateData.url)) {
                return res.status(400).json({ success: false, error: 'Invalid calendar URL' });
            }

            const updatedCalendar = await models.calendar.update(req.params.id, updateData);
            logger.info(`Calendar updated: ${updatedCalendar.name}`);

            res.json(updatedCalendar);
        } catch (error) {
            logger.error('Error updating calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.delete('/:id', verifyToken, async (req, res) => {
        try {
            const calendar = await models.calendar.delete(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }

            logger.info(`Calendar deleted: ${calendar.name}`);
            res.json(calendar);
        } catch (error) {
            logger.error('Error deleting calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.post('/refetch', verifyToken, async (_req, res) => {
        try {
            logger.info('Calendar refetch requested');

            setImmediate(async () => {
                try {
                    await services.calendar.refetchAllCalendars();
                } catch (error) {
                    logger.error('Background refetch failed:', error);
                }
            });

            res.json({ success: true, message: 'Calendar refetch initiated' });
        } catch (error) {
            logger.error('Error initiating calendar refetch:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    return router;
}
