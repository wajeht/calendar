import {
    TimeoutError,
    NotFoundError,
    DatabaseError,
    ICalParseError,
    ValidationError,
    CalendarFetchError,
    ConfigurationError,
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
        throw new ConfigurationError("customConfig must be an object");
    }

    const finalConfig = {
        ...config,
        ...customConfig,
    };

    const icalLibrary = customConfig.ICAL || ICAL;

    const logger = createLogger("calendar");
    const db = finalConfig.database?.instance || createDatabase(finalConfig.db);
    const errors = {
        TimeoutError,
        NotFoundError,
        DatabaseError,
        ICalParseError,
        ValidationError,
        CalendarFetchError,
        ConfigurationError,
        AuthenticationError,
    };
    const utils = createUtils({ logger, config: finalConfig, errors });
    const validators = createValidators({ errors, utils });
    const models = {
        calendar: createCalendar({ db, errors, utils }),
        settings: createSettings({ db, errors }),
    };

    const middleware = {
        auth: createAuthMiddleware({ utils, errors }),
    };

    const services = {
        calendar: createCalendarService({
            logger,
            models,
            errors,
            utils,
            config: finalConfig,
            ICAL: icalLibrary,
        }),
    };

    services.cron = createCronService({
        logger,
        models,
        errors,
        services,
    });

    const context = {
        config: finalConfig,
        db,
        utils,
        logger,
        errors,
        models,
        services,
        middleware,
        validators,
    };

    return config.app.env === "test" ? context : Object.freeze(context);
}
