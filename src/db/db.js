import knex from 'knex';
import knexConfig from './knexfile.js';

export const db = knex(knexConfig);

export function createDatabase(config = {}) {
    const finalConfig = {
        ...knexConfig,
        ...config
    };
    return knex(finalConfig);
}
