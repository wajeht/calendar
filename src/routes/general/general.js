import express from 'express';

export function createGeneralRouter(ctx) {
    const router = express.Router();

    router.get('/', (req, res) => {
        try {
            res.render('general/home.html', {
                title: 'Calendar App',
                message: 'Welcome to the Calendar Application'
            });
        } catch (error) {
            ctx.logger.error('Error rendering home page:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });

    return router;
}

export function notFoundHandler(ctx) {
    return (req, res, next) => {
        ctx.logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);

        if (ctx.utils.isApiRequest(req)) {
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

export function errorHandler(ctx) {
    return (err, req, res, next) => {
        ctx.logger.error('Unhandled error:', err);

        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Internal server error';

        if (ctx.utils.isApiRequest(req)) {
            return res.status(statusCode).json({
                success: false,
                error: ctx.config.app.env === 'development' ? message : 'Internal server error'
            });
        }

        res.status(statusCode).render('general/error.html', {
            title: `${statusCode} - Error`,
            error: ctx.config.app.env === 'development' ? message : 'An error occurred',
            statusCode: statusCode
        });

    };
}
