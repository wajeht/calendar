import { config } from './config.js';
import { createDatabase } from './db/db.js';
import { createLogger } from './logger.js';
import { createCalendar } from './db/models/calendar.js';

export function createContext(customConfig = {}) {
    const finalConfig = {
        ...config,
        ...customConfig
    };

    const logger = createLogger(finalConfig.logger);
    const db = createDatabase(finalConfig.db);
    const calendar = createCalendar(db)

    const ctx = {
        config: finalConfig,
        db,
        logger,
        models: { calendar }
    };

    return ctx;
}
