import {
    NotFoundError,
    DatabaseError,
    ValidationError,
    CalendarFetchError,
    AuthenticationError,
} from "./errors.js";
import ICAL from "ical.js";
import { config } from "./config.js";
import { createDatabase } from "./db/db.js";
import { createCronService } from "./cron.js";
import { createUtils } from "./utils/utils.js";
import { createLogger } from "./utils/logger.js";
import { createValidators } from "./utils/validators.js";
import { createCalendar } from "./api/calendar/model.js";
import { createSettings } from "./api/settings/model.js";
import { createAuthMiddleware } from "./api/auth/middleware.js";
import { createCalendarService } from "./api/calendar/service.js";

export function createContext(customConfig = {}) {
    if (customConfig && typeof customConfig !== "object") {
        throw new Error("customConfig must be an object");
    }

    const finalConfig = {
        ...config,
        ...customConfig,
    };

    const icalLibrary = customConfig.ICAL || ICAL;

    const logger = createLogger(finalConfig.logger);
    const db = finalConfig.database?.instance || createDatabase(finalConfig.db);
    const errors = {
        ValidationError,
        NotFoundError,
        CalendarFetchError,
        DatabaseError,
        AuthenticationError,
    };
    const utils = createUtils({ logger, config: finalConfig });
    const validators = createValidators({ errors, utils });
    const models = {
        calendar: createCalendar({ db, errors, utils }),
        settings: createSettings({ db, errors }),
    };

    const middleware = {
        auth: createAuthMiddleware({
            utils,
            logger,
            errors,
            config: finalConfig,
        }),
    };

    const services = {
        calendar: createCalendarService({
            ICAL: icalLibrary,
            logger,
            models,
            errors,
        }),
    };

    services.cron = createCronService({
        logger,
        services,
        models,
    });

    const context = {
        config: finalConfig,
        db,
        logger,
        errors,
        utils,
        validators,
        models,
        middleware,
        services,
    };

    return config.app.env === "test" ? context : Object.freeze(context);
}
