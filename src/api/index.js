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

            const status = dbHealth.healthy ? 200 : 503;
            return c.json(health, status);
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
        const respond = ({
            status,
            message,
            errors = null,
            data = null,
            htmlTitle = `${status} - Error`,
            htmlMessage = message,
            jsonOnly = false,
        }) => {
            const response = {
                success: false,
                message,
                errors,
                data,
            };

            if (jsonOnly || utils.isApiRequest(c)) {
                return c.json(response, status);
            }

            return htmlError(c, htmlTitle, htmlMessage, status);
        };

        if (err instanceof ValidationError) {
            return respond({
                status: err.status,
                message: err.message,
                errors: err.errors,
                jsonOnly: true,
            });
        }

        if (err instanceof AuthenticationError) {
            logger.warn("authentication failed", { method: c.req.method, url: requestPath(c) });
            return respond({ status: err.status, message: err.message, jsonOnly: true });
        }

        if (err instanceof NotFoundError) {
            logger.warn("resource not found", {
                message: err.message,
                method: c.req.method,
                url: requestPath(c),
            });
            return respond({
                status: err.status,
                message: err.message,
                htmlTitle: "404 - Not Found",
            });
        }

        if (err instanceof CalendarFetchError) {
            logger.error("calendar fetch error", { error: err.message, context: err.context });
            return respond({
                status: err.status,
                message: err.message,
                data: config.app.env === "development" ? { context: err.context } : null,
                htmlTitle: "502 - Service Error",
                htmlMessage: "Calendar service temporarily unavailable",
            });
        }

        if (err instanceof DatabaseError) {
            logger.error("database error", { error: err.message });
            const message =
                config.app.env === "development" ? err.message : "Database error occurred";
            return respond({
                status: err.status,
                message,
                htmlTitle: "500 - Database Error",
            });
        }

        if (err instanceof TimeoutError) {
            logger.error("timeout error", { error: err.message });
            return respond({
                status: err.status,
                message: err.message,
                htmlTitle: "408 - Request Timeout",
                htmlMessage: "Request timed out",
            });
        }

        if (err instanceof ICalParseError) {
            logger.error("ical parse error", { error: err.message });
            return respond({
                status: err.status,
                message: err.message,
                htmlTitle: "422 - Calendar Parse Error",
                htmlMessage: "Invalid calendar data format",
            });
        }

        if (err instanceof ConfigurationError) {
            logger.error("configuration error", { error: err.message });
            return respond({
                status: err.status,
                message: config.app.env === "development" ? err.message : "Configuration error",
                htmlTitle: "500 - Configuration Error",
                htmlMessage:
                    config.app.env === "development" ? err.message : "Service configuration error",
            });
        }

        if (err instanceof HTTPException) {
            const status = err.status;
            const message = err.message || err.getResponse().statusText;
            return respond({ status, message });
        }

        const message = err instanceof Error ? err.message : "Internal server error";
        const stack = err instanceof Error ? err.stack : undefined;
        logger.error("unhandled error", { error: message, stack });

        return respond({
            status: 500,
            message: config.app.env === "development" ? message : "Internal server error",
            htmlMessage: config.app.env === "development" ? message : "An error occurred",
        });
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
