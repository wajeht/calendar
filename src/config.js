import 'dotenv/config';

export const config = {
    app: {
        port: parseInt(process.env.APP_PORT) || 80,
        env: process.env.APP_ENV || 'development',
        password: process.env.password || 'password',
        jsonLimit: process.env.JSON_LIMIT || '1mb',
        urlEncodedLimit: process.env.URL_ENCODED_LIMIT || '1mb'
    },

    cors: {
        origin: process.env.CORS_ORIGIN || true,
        credentials: process.env.CORS_CREDENTIALS === 'true' || false
    },

    security: {
        contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : true,
        crossOriginEmbedderPolicy: false
    },

    compression: {
        threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
        level: parseInt(process.env.COMPRESSION_LEVEL) || 6
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: process.env.RATE_LIMIT_STANDARD_HEADERS !== 'false',
        legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS === 'true',
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
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
    },

    auth: {
        password: process.env.APP_PASSWORD || 'password',
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
        cookieDomain: process.env.COOKIE_DOMAIN || undefined
    }
};
