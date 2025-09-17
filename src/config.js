import 'dotenv/config';
import path from 'node:path'

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')), quiet: true });

export const config = {
    app: {
        port: parseInt(process.env.APP_PORT) || 80,
        env: process.env.APP_ENV || 'development',
        password: process.env.password || 'password'
    },

    jobs: {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined
        },
        maxRetries: parseInt(process.env.JOB_MAX_RETRIES) || 3
    },

    logger: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

