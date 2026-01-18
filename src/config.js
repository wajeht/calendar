try {
    process.loadEnvFile("./.env");
} catch {}

function deepFreeze(obj) {
    Object.values(obj).forEach((val) => {
        if (typeof val === "object" && val !== null) {
            deepFreeze(val);
        }
    });
    return Object.freeze(obj);
}

export const config = deepFreeze({
    app: {
        vuePort: parseInt(process.env.APP_VUE_PORT) || 3000,
        port: parseInt(process.env.APP_PORT) || 80,
        env: process.env.APP_ENV || process.env.NODE_ENV || "development",
        jsonLimit: process.env.JSON_LIMIT || "1mb",
        urlEncodedLimit: process.env.URL_ENCODED_LIMIT || "1mb",
    },

    cors: {
        origin: process.env.CORS_ORIGIN || false,
        credentials: process.env.CORS_CREDENTIALS === "true" || false,
    },

    timeouts: {
        calendarFetch: parseInt(process.env.CALENDAR_FETCH_TIMEOUT) || 30000,
        server: parseInt(process.env.SERVER_TIMEOUT) || 120000,
        shutdown: parseInt(process.env.SHUTDOWN_TIMEOUT) || 10000,
    },

    security: {
        contentSecurityPolicy:
            (process.env.APP_ENV || process.env.NODE_ENV) === "development" ? false : true,
        crossOriginEmbedderPolicy: false,
    },

    compression: {
        threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
        level: parseInt(process.env.COMPRESSION_LEVEL) || 6,
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
        standardHeaders: process.env.RATE_LIMIT_STANDARD_HEADERS !== "false",
        legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS === "true",
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === "true",
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === "true",
    },

    logger: {
        level: process.env.LOG_LEVEL || "info",
    },

    auth: {
        sessionSecret: (() => {
            if (process.env.npm_lifecycle_event === "build") {
                return "build-time-placeholder";
            }
            if (!process.env.SESSION_SECRET) {
                if (process.env.NODE_ENV === "production") {
                    throw new Error("SESSION_SECRET must be set in production");
                }
                return "development-session-secret-" + Date.now();
            }
            return process.env.SESSION_SECRET;
        })(),
        cookieDomain: process.env.COOKIE_DOMAIN || undefined,
        idleTimeout: parseInt(process.env.SESSION_IDLE_TIMEOUT) || 7 * 24 * 60 * 60 * 1000, // 7 days
        absoluteTimeout: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT) || 30 * 24 * 60 * 60 * 1000, // 30 days
    },

    cache: {
        staticMaxAge: process.env.STATIC_CACHE_MAX_AGE || "365d",
        staticImmutable: process.env.STATIC_CACHE_IMMUTABLE !== "false",
        staticExtensions: process.env.STATIC_CACHE_EXTENSIONS?.split(",") || [
            "css",
            "js",
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "svg",
            "ico",
            "woff",
            "woff2",
            "ttf",
            "eot",
            "txt",
        ],
    },
});
