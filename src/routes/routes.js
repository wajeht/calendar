import express from 'express';
import { createCalendarRouter } from "./api/calendar.js";
import { createGeneralRouter, notFoundHandler, errorHandler } from "./general/general.js";

export function createRouter(ctx) {
    const router = express.Router();

    router.use('/', createGeneralRouter(ctx));

    router.use('/api/calendars', createCalendarRouter(ctx));

    router.use(notFoundHandler(ctx));

    router.use(errorHandler(ctx));

    return router;
}
