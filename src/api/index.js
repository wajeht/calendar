import express from "express";
import { createAuthRouter } from "./auth/index.js";
import { createSettingsRouter } from "./settings/index.js";
import { createCalendarRouter } from "./calendar/index.js";

export function createGeneralRouter(dependencies = {}) {
    const { utils, db, errors } = dependencies;

    if (!errors) throw new Error("Errors required for general router");
    const { ConfigurationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for general router");
    if (!db) throw new ConfigurationError("Database required for general router");

    const router = express.Router();

    router.get("/", (_req, res) => {
        return res
            .setHeader("Content-Type", "text/html")
            .status(200)
            .sendFile(utils.cwd() + "/public/index.html");
    });

    router.get("/healthz", async (_req, res) => {
        try {
            const dbHealth = await db.healthCheck();
            const health = {
                status: dbHealth.healthy ? "healthy" : "unhealthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: dbHealth,
            };

            const statusCode = dbHealth.healthy ? 200 : 503;
            res.status(statusCode).json(health);
        } catch (error) {
            res.status(503).json({
                status: "unhealthy",
                timestamp: new Date().toISOString(),
                error: error.message,
            });
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

    return (req, res, _next) => {
        logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);

        if (utils.isApiRequest(req)) {
            return res.status(404).json({
                success: false,
                message: "Route not found",
                errors: null,
                data: null,
            });
        }

        return res
            .setHeader("Content-Type", "text/html")
            .status(200)
            .sendFile(utils.cwd() + "/public/index.html");
    };
}

export function errorHandler(dependencies = {}) {
    const { logger, utils, config, errors } = dependencies;

    if (!errors) throw new Error("Errors required for errorHandler");

    const {
        ParseError,
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

    return (err, req, res, _next) => {
        if (err instanceof ValidationError) {
            const response = {
                success: false,
                message: err.message,
                errors: err.errors,
                data: null,
            };

            if (utils.isApiRequest(req)) {
                return res.status(400).json(response);
            }
            return res.status(400).json(response);
        }

        if (err instanceof AuthenticationError) {
            logger.warn(`401 - Authentication failed: ${req.method} ${req.originalUrl}`);
            if (utils.isApiRequest(req)) {
                return res.status(401).json({
                    success: false,
                    message: err.message,
                    errors: null,
                    data: null,
                });
            }
            return res.status(401).json({
                success: false,
                message: err.message,
                errors: null,
                data: null,
            });
        }

        if (err instanceof NotFoundError) {
            logger.warn(`404 - ${err.message}: ${req.method} ${req.originalUrl}`);
            if (utils.isApiRequest(req)) {
                return res.status(404).json({
                    success: false,
                    message: err.message,
                    errors: null,
                    data: null,
                });
            }
            return res.status(404).render("general/error.html", {
                title: "404 - Not Found",
                error: err.message,
                statusCode: 404,
            });
        }

        if (err instanceof CalendarFetchError) {
            logger.error("Calendar fetch error:", err);
            if (utils.isApiRequest(req)) {
                return res.status(502).json({
                    success: false,
                    message: err.message,
                    errors: null,
                    data: config.app.env === "development" ? { context: err.context } : null,
                });
            }
            return res.status(502).render("general/error.html", {
                title: "502 - Service Error",
                error: "Calendar service temporarily unavailable",
                statusCode: 502,
            });
        }

        if (err instanceof DatabaseError) {
            logger.error("Database error:", err);
            const message =
                config.app.env === "development" ? err.message : "Database error occurred";
            if (utils.isApiRequest(req)) {
                return res.status(500).json({
                    success: false,
                    message: message,
                    errors: null,
                    data: null,
                });
            }
            return res.status(500).render("general/error.html", {
                title: "500 - Database Error",
                error: message,
                statusCode: 500,
            });
        }

        if (err instanceof TimeoutError) {
            logger.error("Timeout error:", err);
            if (utils.isApiRequest(req)) {
                return res.status(408).json({
                    success: false,
                    message: err.message,
                    errors: null,
                    data: null,
                });
            }
            return res.status(408).render("general/error.html", {
                title: "408 - Request Timeout",
                error: "Request timed out",
                statusCode: 408,
            });
        }

        if (err instanceof ICalParseError) {
            logger.error("iCal parse error:", err);
            if (utils.isApiRequest(req)) {
                return res.status(422).json({
                    success: false,
                    message: err.message,
                    errors: null,
                    data: null,
                });
            }
            return res.status(422).render("general/error.html", {
                title: "422 - Calendar Parse Error",
                error: "Invalid calendar data format",
                statusCode: 422,
            });
        }

        if (err instanceof ParseError) {
            logger.error("Parse error:", err);
            if (utils.isApiRequest(req)) {
                return res.status(422).json({
                    success: false,
                    message: err.message,
                    errors: null,
                    data: null,
                });
            }
            return res.status(422).render("general/error.html", {
                title: "422 - Parse Error",
                error: "Invalid data format",
                statusCode: 422,
            });
        }

        if (err instanceof ConfigurationError) {
            logger.error("Configuration error:", err);
            if (utils.isApiRequest(req)) {
                return res.status(500).json({
                    success: false,
                    message: config.app.env === "development" ? err.message : "Configuration error",
                    errors: null,
                    data: null,
                });
            }
            return res.status(500).render("general/error.html", {
                title: "500 - Configuration Error",
                error:
                    config.app.env === "development" ? err.message : "Service configuration error",
                statusCode: 500,
            });
        }

        logger.error("Unhandled error:", err);
        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || "Internal server error";

        if (utils.isApiRequest(req)) {
            return res.status(statusCode).json({
                success: false,
                message: config.app.env === "development" ? message : "Internal server error",
                errors: null,
                data: null,
            });
        }

        res.status(statusCode).render("general/error.html", {
            title: `${statusCode} - Error`,
            error: config.app.env === "development" ? message : "An error occurred",
            statusCode: statusCode,
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

    const router = express.Router();

    router.use(
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

    router.use(
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

    router.use(
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

    router.use("/", createGeneralRouter({ utils, db, errors }));

    router.use(notFoundHandler({ logger, utils, errors }));

    router.use(errorHandler({ logger, utils, config, errors }));

    return router;
}
