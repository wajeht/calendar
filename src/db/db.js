import knex from "knex";
import knexConfig from "./knexfile.js";

export function createDatabase(config = {}) {
    const finalConfig = {
        ...knexConfig,
        ...config,
        pool: {
            ...knexConfig.pool,
            ...config.pool,
        },
    };

    const db = knex(finalConfig);

    db.healthCheck = async () => {
        try {
            await db.raw("SELECT 1");
            return { healthy: true };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    };

    return db;
}
