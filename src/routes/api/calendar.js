import express from 'express';

export function createCalendarRouter(ctx) {
    const router = express.Router();

    router.get('/', async (_req, res) => {
        try {
            const calendars = await ctx.models.calendar.getAll();
            res.json({ success: true, data: calendars });
        } catch (error) {
            ctx.logger.error('Error fetching calendars:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.get('/:id', async (req, res) => {
        try {
            const calendar = await ctx.models.calendar.getById(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }
            res.json({ success: true, data: calendar });
        } catch (error) {
            ctx.logger.error('Error fetching calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { name, url } = req.body;
            if (!name || !url) {
                return res.status(400).json({ success: false, error: 'Name and URL are required' });
            }

            const existingCalendar = await ctx.models.calendar.getByUrl(url);
            if (existingCalendar) {
                return res.status(409).json({ success: false, error: 'Calendar with this URL already exists' });
            }

            const calendar = await ctx.models.calendar.create(req.body);
            ctx.logger.info(`Calendar created: ${calendar.name}`);

            res.status(201).json({ success: true, data: calendar });
        } catch (error) {
            ctx.logger.error('Error creating calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.patch('/:id', async (req, res) => {
        try {
            const calendar = await ctx.models.calendar.getById(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }

            const updatedCalendar = await ctx.models.calendar.update(req.params.id, req.body);
            ctx.logger.info(`Calendar updated: ${updatedCalendar.name}`);

            res.json({ success: true, data: updatedCalendar });
        } catch (error) {
            ctx.logger.error('Error updating calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const calendar = await ctx.models.calendar.delete(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }

            ctx.logger.info(`Calendar deleted: ${calendar.name}`);
            res.json({ success: true, data: calendar });
        } catch (error) {
            ctx.logger.error('Error deleting calendar:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.patch('/:id/toggle', async (req, res) => {
        try {
            const calendar = await ctx.models.calendar.toggleVisibility(req.params.id);
            if (!calendar) {
                return res.status(404).json({ success: false, error: 'Calendar not found' });
            }

            ctx.logger.info(`Calendar visibility toggled: ${calendar.name} - hidden: ${calendar.hidden}`);
            res.json({ success: true, data: calendar });
        } catch (error) {
            ctx.logger.error('Error toggling calendar visibility:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.get('/visible/all', async (_req, res) => {
        try {
            const calendars = await ctx.models.calendar.getVisible();
            res.json({ success: true, data: calendars });
        } catch (error) {
            ctx.logger.error('Error fetching visible calendars:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    return router;
}
