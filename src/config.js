// Bun automatically loads .env files, no need for dotenv
// import "dotenv/config";

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
        vuePort: parseInt(Bun.env.APP_VUE_PORT) || 3000,
        port: parseInt(Bun.env.APP_PORT) || 80,
        env: Bun.env.APP_ENV || Bun.env.APP_ENV || "development",
        jsonLimit: Bun.env.JSON_LIMIT || "1mb",
        urlEncodedLimit: Bun.env.URL_ENCODED_LIMIT || "1mb",
    },

    cors: {
        origin: Bun.env.CORS_ORIGIN || true,
        credentials: Bun.env.CORS_CREDENTIALS === "true" || false,
    },

    security: {
        contentSecurityPolicy:
            (Bun.env.APP_ENV || Bun.env.APP_ENV) === "development" ? false : true,
        crossOriginEmbedderPolicy: false,
    },

    compression: {
        threshold: parseInt(Bun.env.COMPRESSION_THRESHOLD) || 1024,
        level: parseInt(Bun.env.COMPRESSION_LEVEL) || 6,
    },

    rateLimit: {
        windowMs: parseInt(Bun.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(Bun.env.RATE_LIMIT_MAX) || 1000,
        standardHeaders: Bun.env.RATE_LIMIT_STANDARD_HEADERS !== "false",
        legacyHeaders: Bun.env.RATE_LIMIT_LEGACY_HEADERS === "true",
        skipSuccessfulRequests: Bun.env.RATE_LIMIT_SKIP_SUCCESSFUL === "true",
        skipFailedRequests: Bun.env.RATE_LIMIT_SKIP_FAILED === "true",
    },

    logger: {
        level: Bun.env.LOG_LEVEL || "info",
    },

    auth: {
        sessionSecret: (() => {
            if (Bun.env.npm_lifecycle_event === "build") {
                return "build-time-placeholder";
            }
            if (!Bun.env.SESSION_SECRET) {
                if (Bun.env.APP_ENV === "production") {
                    throw new Error("SESSION_SECRET must be set in production");
                }
                return "development-session-secret-" + Date.now();
            }
            return Bun.env.SESSION_SECRET;
        })(),
        cookieDomain: Bun.env.COOKIE_DOMAIN || undefined,
    },

    cache: {
        staticMaxAge: Bun.env.STATIC_CACHE_MAX_AGE || "365d",
        staticImmutable: Bun.env.STATIC_CACHE_IMMUTABLE !== "false",
        staticExtensions: Bun.env.STATIC_CACHE_EXTENSIONS?.split(",") || [
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
