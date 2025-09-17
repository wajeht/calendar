import express from 'express';
import { createCalendarRouter } from "./calendars/calendar.js";

export function createRouter(ctx) {
    const router = express.Router();

    router.use('/calendars', createCalendarRouter(ctx));

    return router;
}

