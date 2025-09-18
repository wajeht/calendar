import { config } from './config.js';
import { createDatabase } from './db/db.js';
import { createLogger } from './logger.js';
import { createCalendar } from './routes/api/calendar/model.js';
import { createUtils } from './utils.js';
import { createAuthMiddleware } from './routes/api/auth/middleware.js';

export function createContext(customConfig = {}) {
    const finalConfig = {
        ...config,
        ...customConfig
    };

    const logger = createLogger(finalConfig.logger);
    const db = createDatabase(finalConfig.db);
    const utils = createUtils({ logger, config: finalConfig });
    const calendar = createCalendar(db);
    const authMiddleware = createAuthMiddleware({ utils, logger });
    const ctx = {
        config: finalConfig,
        db,
        logger,
        utils,
        models: { calendar },
        middleware: { auth: authMiddleware }
    };

    return ctx;
}
