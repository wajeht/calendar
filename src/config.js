import "dotenv/config";

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
        port: parseInt(process.env.APP_PORT) || 80,
        env: process.env.APP_ENV || process.env.NODE_ENV || "development",
        jsonLimit: process.env.JSON_LIMIT || "1mb",
        urlEncodedLimit: process.env.URL_ENCODED_LIMIT || "1mb",
    },

    cors: {
        origin: process.env.CORS_ORIGIN || true,
        credentials: process.env.CORS_CREDENTIALS === "true" || false,
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
        sessionSecret:
            process.env.SESSION_SECRET ||
            (() => {
                if (process.env.NODE_ENV === "production") {
                    throw new Error("SESSION_SECRET must be set in production");
                }
                return "development-session-secret-" + Date.now();
            })(),
        cookieDomain: process.env.COOKIE_DOMAIN || undefined,
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
