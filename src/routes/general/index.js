import express from 'express';

export function createGeneralRouter(dependencies = {}) {
    // General router doesn't need dependencies - just serves static content
    const router = express.Router();

    router.get('/', async (req, res) => {
        res.render('general/home.html', {
            title: 'Calendar',
            layout: '_layouts/calendar.html',
        });
    });

    return router;
}

export function notFoundHandler(dependencies = {}) {
    const { logger, utils } = dependencies;

    if (!logger) throw new Error('Logger required for notFoundHandler');
    if (!utils) throw new Error('Utils required for notFoundHandler');

    return (req, res, _next) => {
        logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);

        if (utils.isApiRequest(req)) {
            return res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        }

        res.status(404).render('general/error.html', {
            title: '404 - Page Not Found',
            error: 'The page you are looking for could not be found.',
            statusCode: 404
        });

    };
}

export function errorHandler(dependencies = {}) {
    const { logger, utils, config } = dependencies;

    if (!logger) throw new Error('Logger required for errorHandler');
    if (!utils) throw new Error('Utils required for errorHandler');
    if (!config) throw new Error('Config required for errorHandler');

    return (err, req, res, _next) => {
        logger.error('Unhandled error:', err);

        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Internal server error';

        if (utils.isApiRequest(req)) {
            return res.status(statusCode).json({
                success: false,
                error: config.app.env === 'development' ? message : 'Internal server error'
            });
        }

        res.status(statusCode).render('general/error.html', {
            title: `${statusCode} - Error`,
            error: config.app.env === 'development' ? message : 'An error occurred',
            statusCode: statusCode
        });

    };
}
