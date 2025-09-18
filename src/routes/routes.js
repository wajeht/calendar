import express from 'express';
import { createCalendarRouter } from "./api/calendar/routes.js";
import { createAuthRouter } from "./api/auth/routes.js";
import { createGeneralRouter, notFoundHandler, errorHandler } from "./general/index.js";

export function createRouter(dependencies = {}) {
    const { models, services, middleware, utils, logger, config, errors, validators } = dependencies;

    if (!models) throw new Error('Models required for router');
    if (!services) throw new Error('Services required for router');
    if (!middleware) throw new Error('Middleware required for router');
    if (!utils) throw new Error('Utils required for router');
    if (!logger) throw new Error('Logger required for router');
    if (!config) throw new Error('Config required for router');

    const router = express.Router();

    router.use('/', createGeneralRouter());

    router.use('/api/auth', createAuthRouter({
        middleware,
        utils,
        logger,
        config
    }));

    router.use('/api/calendars', createCalendarRouter({
        models,
        services,
        middleware,
        utils,
        logger,
        errors,
        validators
    }));

    router.use(notFoundHandler({ logger, utils }));

    router.use(errorHandler({ logger, utils, config, errors }));

    return router;
}
