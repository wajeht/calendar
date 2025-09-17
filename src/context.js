import { config } from './config.js';
import { createDatabase } from './db/index.js';
import { createLogger } from './logger.js';

export function createContext(customConfig = {}) {
  const finalConfig = {
    ...config,
    ...customConfig
  };

  const logger = createLogger(finalConfig.logger);
  const db = createDatabase(finalConfig.db);

  const ctx = {
    config: finalConfig,
    db,
    logger,
  };

  return ctx;
}

