import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { htmlError, requestPath, servePublicIndex } from "./http.js";
import { createAuthRouter } from "./auth/index.js";
import { createSettingsRouter } from "./settings/index.js";
import { createCalendarRouter } from "./calendar/index.js";
import { createFeedRouter } from "./feed/index.js";

export function createGeneralRouter(dependencies = {}) {
    const { db, errors } = dependencies;

    if (!errors) throw new Error("Errors required for general router");
    const { ConfigurationError } = errors;

    if (!db) throw new ConfigurationError("Database required for general router");

    const router = new Hono({ strict: false });

    router.get("/", (c) => {
        return servePublicIndex(c);
    });

    router.get("/healthz", async (c) => {
        try {
            const dbHealth = await db.healthCheck();
            const health = {
                status: dbHealth.healthy ? "healthy" : "unhealthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: dbHealth,
            };

            const statusCode = dbHealth.healthy ? 200 : 503;
            return c.json(health, statusCode);
        } catch (error) {
            return c.json(
                {
                    status: "unhealthy",
                    timestamp: new Date().toISOString(),
                    error: error.message,
                },
                503,
            );
        }
    });

    return router;
}

export function notFoundHandler(dependencies = {}) {
    const { logger, utils, errors } = dependencies;

    if (!errors) throw new Error("Errors required for notFoundHandler");
    const { ConfigurationError } = errors;

    if (!logger) throw new ConfigurationError("Logger required for notFoundHandler");
    if (!utils) throw new ConfigurationError("Utils required for notFoundHandler");

    return (c) => {
        logger.warn("route not found", { method: c.req.method, url: requestPath(c) });

        if (utils.isApiRequest(c)) {
            return c.json(
                {
                    success: false,
                    message: "Route not found",
                    errors: null,
                    data: null,
                },
                404,
            );
        }

        return servePublicIndex(c);
    };
}

export function errorHandler(dependencies = {}) {
    const { logger, utils, config, errors } = dependencies;

    if (!errors) throw new Error("Errors required for errorHandler");

    const {
        TimeoutError,
        DatabaseError,
        NotFoundError,
        ICalParseError,
        ValidationError,
        CalendarFetchError,
        ConfigurationError,
        AuthenticationError,
    } = errors;

    if (!logger) throw new ConfigurationError("Logger required for errorHandler");
    if (!utils) throw new ConfigurationError("Utils required for errorHandler");
    if (!config) throw new ConfigurationError("Config required for errorHandler");

    return (err, c) => {
        if (err instanceof ValidationError) {
            const response = {
                success: false,
                message: err.message,
                errors: err.errors,
                data: null,
            };

            if (utils.isApiRequest(c)) {
                return c.json(response, 400);
            }
            return c.json(response, 400);
        }

        if (err instanceof AuthenticationError) {
            logger.warn("authentication failed", { method: c.req.method, url: requestPath(c) });
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message: err.message,
                        errors: null,
                        data: null,
                    },
                    401,
                );
            }
            return c.json(
                {
                    success: false,
                    message: err.message,
                    errors: null,
                    data: null,
                },
                401,
            );
        }

        if (err instanceof NotFoundError) {
            logger.warn("resource not found", {
                message: err.message,
                method: c.req.method,
                url: requestPath(c),
            });
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message: err.message,
                        errors: null,
                        data: null,
                    },
                    404,
                );
            }
            return htmlError(c, "404 - Not Found", err.message, 404);
        }

        if (err instanceof CalendarFetchError) {
            logger.error("calendar fetch error", { error: err.message, context: err.context });
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message: err.message,
                        errors: null,
                        data: config.app.env === "development" ? { context: err.context } : null,
                    },
                    502,
                );
            }
            return htmlError(
                c,
                "502 - Service Error",
                "Calendar service temporarily unavailable",
                502,
            );
        }

        if (err instanceof DatabaseError) {
            logger.error("database error", { error: err.message });
            const message =
                config.app.env === "development" ? err.message : "Database error occurred";
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message: message,
                        errors: null,
                        data: null,
                    },
                    500,
                );
            }
            return htmlError(c, "500 - Database Error", message, 500);
        }

        if (err instanceof TimeoutError) {
            logger.error("timeout error", { error: err.message });
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message: err.message,
                        errors: null,
                        data: null,
                    },
                    408,
                );
            }
            return htmlError(c, "408 - Request Timeout", "Request timed out", 408);
        }

        if (err instanceof ICalParseError) {
            logger.error("ical parse error", { error: err.message });
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message: err.message,
                        errors: null,
                        data: null,
                    },
                    422,
                );
            }
            return htmlError(c, "422 - Calendar Parse Error", "Invalid calendar data format", 422);
        }

        if (err instanceof ConfigurationError) {
            logger.error("configuration error", { error: err.message });
            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message:
                            config.app.env === "development" ? err.message : "Configuration error",
                        errors: null,
                        data: null,
                    },
                    500,
                );
            }
            return htmlError(
                c,
                "500 - Configuration Error",
                config.app.env === "development" ? err.message : "Service configuration error",
                500,
            );
        }

        if (err instanceof HTTPException) {
            const statusCode = err.status;
            const message = err.message || err.getResponse().statusText;

            if (utils.isApiRequest(c)) {
                return c.json(
                    {
                        success: false,
                        message,
                        errors: null,
                        data: null,
                    },
                    statusCode,
                );
            }

            return htmlError(c, `${statusCode} - Error`, message, statusCode);
        }

        logger.error("unhandled error", { error: err.message, stack: err.stack });
        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || "Internal server error";

        if (utils.isApiRequest(c)) {
            return c.json(
                {
                    success: false,
                    message: config.app.env === "development" ? message : "Internal server error",
                    errors: null,
                    data: null,
                },
                statusCode,
            );
        }

        return htmlError(
            c,
            `${statusCode} - Error`,
            config.app.env === "development" ? message : "An error occurred",
            statusCode,
        );
    };
}

export function createRouter(dependencies = {}) {
    const { models, services, middleware, utils, logger, config, errors, validators, db } =
        dependencies;

    if (!errors) throw new Error("Errors required for router");
    const { ConfigurationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for router");
    if (!logger) throw new ConfigurationError("Logger required for router");
    if (!config) throw new ConfigurationError("Config required for router");
    if (!models) throw new ConfigurationError("Models required for router");
    if (!services) throw new ConfigurationError("Services required for router");
    if (!middleware) throw new ConfigurationError("Middleware required for router");

    const router = new Hono({ strict: false });

    router.route(
        "/api/auth",
        createAuthRouter({
            utils,
            logger,
            config,
            errors,
            models,
            services,
            validators,
            middleware,
        }),
    );

    router.route(
        "/api/calendars",
        createCalendarRouter({
            utils,
            logger,
            errors,
            models,
            services,
            middleware,
            validators,
        }),
    );

    router.route(
        "/api/settings",
        createSettingsRouter({
            utils,
            logger,
            errors,
            models,
            services,
            middleware,
            validators,
        }),
    );

    router.route(
        "/api/feed",
        createFeedRouter({
            logger,
            errors,
            models,
            services,
        }),
    );

    router.route("/", createGeneralRouter({ utils, db, errors }));

    return router;
}
