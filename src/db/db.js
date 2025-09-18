import knex from 'knex';
import knexConfig from './knexfile.js';

export function createDatabase(config = {}) {
    const finalConfig = {
        ...knexConfig,
        ...config
    };
    return knex(finalConfig);
}
