import 'dotenv/config';

export const config = {
    app: {
        port: parseInt(process.env.PORT) || 80,
        env: process.env.NODE_ENV || 'development'
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

