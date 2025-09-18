import express from 'express';

export function createGeneralRouter(_dependencies = {}) {
    const router = express.Router();

    router.get('/', async (_req, res) => {
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
    const { logger, utils, config, errors } = dependencies;

    if (!logger) throw new Error('Logger required for errorHandler');
    if (!utils) throw new Error('Utils required for errorHandler');
    if (!config) throw new Error('Config required for errorHandler');
    if (!errors) throw new Error('Errors required for errorHandler');

    const { ValidationError, NotFoundError, CalendarFetchError, DatabaseError, AuthenticationError } = errors;

    return (err, req, res, _next) => {
        if (err instanceof ValidationError) {
            const response = {
                success: false,
                error: err.message
            };
            if (err.field) response.field = err.field;

            if (utils.isApiRequest(req)) {
                return res.status(400).json(response);
            }
            return res.status(400).render('general/error.html', {
                title: '400 - Validation Error',
                error: err.message,
                statusCode: 400
            });
        }

        if (err instanceof AuthenticationError) {
            logger.warn(`401 - Authentication failed: ${req.method} ${req.originalUrl}`);
            if (utils.isApiRequest(req)) {
                return res.status(401).json({ success: false, error: err.message });
            }
            return res.status(401).render('general/error.html', {
                title: '401 - Unauthorized',
                error: err.message,
                statusCode: 401
            });
        }

        if (err instanceof NotFoundError) {
            logger.warn(`404 - ${err.message}: ${req.method} ${req.originalUrl}`);
            if (utils.isApiRequest(req)) {
                return res.status(404).json({ success: false, error: err.message });
            }
            return res.status(404).render('general/error.html', {
                title: '404 - Not Found',
                error: err.message,
                statusCode: 404
            });
        }

        if (err instanceof CalendarFetchError) {
            logger.error('Calendar fetch error:', err);
            if (utils.isApiRequest(req)) {
                return res.status(502).json({
                    success: false,
                    error: err.message,
                    context: config.app.env === 'development' ? err.context : undefined
                });
            }
            return res.status(502).render('general/error.html', {
                title: '502 - Service Error',
                error: 'Calendar service temporarily unavailable',
                statusCode: 502
            });
        }

        if (err instanceof DatabaseError) {
            logger.error('Database error:', err);
            const message = config.app.env === 'development' ? err.message : 'Database error occurred';
            if (utils.isApiRequest(req)) {
                return res.status(500).json({ success: false, error: message });
            }
            return res.status(500).render('general/error.html', {
                title: '500 - Database Error',
                error: message,
                statusCode: 500
            });
        }

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
