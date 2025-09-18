import ICAL from 'ical.js';
import { config } from './config.js';
import { createUtils } from './utils.js';
import { createLogger } from './logger.js';
import { createDatabase } from './db/db.js';
import { createValidators } from './validators.js';
import { createCalendar } from './routes/api/calendar/model.js';
import { createAuthMiddleware } from './routes/api/auth/middleware.js';
import { createCalendarService } from './routes/api/calendar/service.js';
import { ValidationError, NotFoundError, CalendarFetchError, DatabaseError } from './errors.js';

export function createContext(customConfig = {}) {
    const finalConfig = {
        ...config,
        ...customConfig
    };

    const icalLibrary = customConfig.ICAL || ICAL;

    const logger = createLogger(finalConfig.logger);
    const db = createDatabase(finalConfig.db);
    const errors = { ValidationError, NotFoundError, CalendarFetchError, DatabaseError };
    const utils = createUtils({ logger, config: finalConfig });
    const validators = createValidators({ errors, utils });
    const models = {
        calendar: createCalendar({ db, errors, utils })
    };

    const middleware = {
        auth: createAuthMiddleware({ utils, logger, config: finalConfig })
    };

    const services = {
        calendar: createCalendarService({
            ICAL: icalLibrary,
            logger,
            models,
            errors
        })
    };

    return {
        config: finalConfig,
        db,
        logger,
        errors,
        utils,
        validators,
        models,
        middleware,
        services
    };
}
