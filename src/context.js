import { config } from './config.js';
import { createDatabase } from './db/db.js';
import { createLogger } from './logger.js';
import { createCalendar } from './routes/api/calendar/model.js';
import { createUtils } from './utils.js';
import { createAuthMiddleware } from './routes/api/auth/middleware.js';
import { createCalendarService } from './routes/api/calendar/service.js';
import ICAL from 'ical.js';

export function createContext(customConfig = {}) {
    const finalConfig = {
        ...config,
        ...customConfig
    };

    const icalLibrary = customConfig.ICAL || ICAL;

    const logger = createLogger(finalConfig.logger);
    const db = createDatabase(finalConfig.db);
    const utils = createUtils({ logger, config: finalConfig });
    const models = {
        calendar: createCalendar(db)
    };

    const middleware = {
        auth: createAuthMiddleware({ utils, logger })
    };

    const services = {
        calendar: createCalendarService({
            ICAL: icalLibrary,
            logger,
            models
        })
    };

    return {
        config: finalConfig,
        db,
        logger,
        utils,
        models,
        middleware,
        services
    };
}
