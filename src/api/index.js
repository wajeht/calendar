import express from "express";
import { createAuthRouter } from "./auth/index.js";
import { createSettingsRouter } from "./settings/index.js";
import { createCalendarRouter } from "./calendar/index.js";

export function createGeneralRouter(dependencies = {}) {
    const { utils, db } = dependencies;

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
    const { logger, utils } = dependencies;

    if (!logger) throw new Error("Logger required for notFoundHandler");
    if (!utils) throw new Error("Utils required for notFoundHandler");

    return (req, res, _next) => {
        logger.warn(`404 - Not Found: ${req.method} ${req.originalUrl}`);

        if (utils.isApiRequest(req)) {
            return res.status(404).json({
                success: false,
                message: "Route not found",
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

    if (!logger) throw new Error("Logger required for errorHandler");
    if (!utils) throw new Error("Utils required for errorHandler");
    if (!config) throw new Error("Config required for errorHandler");
    if (!errors) throw new Error("Errors required for errorHandler");

    const {
        ValidationError,
        NotFoundError,
        CalendarFetchError,
        DatabaseError,
        AuthenticationError,
    } = errors;

    return (err, req, res, _next) => {
        if (err instanceof ValidationError) {
            const response = {
                success: false,
                message: err.message,
                errors: err.errors,
            };

            if (utils.isApiRequest(req)) {
                return res.status(400).json(response);
            }
            return res.status(400).json(response);
        }

        if (err instanceof AuthenticationError) {
            logger.warn(`401 - Authentication failed: ${req.method} ${req.originalUrl}`);
            if (utils.isApiRequest(req)) {
                return res.status(401).json({ success: false, message: err.message });
            }
            return res.status(401).json({ success: false, message: err.message });
        }

        if (err instanceof NotFoundError) {
            logger.warn(`404 - ${err.message}: ${req.method} ${req.originalUrl}`);
            if (utils.isApiRequest(req)) {
                return res.status(404).json({ success: false, message: err.message });
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
                    context: config.app.env === "development" ? err.context : undefined,
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
                return res.status(500).json({ success: false, message: message });
            }
            return res.status(500).render("general/error.html", {
                title: "500 - Database Error",
                error: message,
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

    if (!models) throw new Error("Models required for router");
    if (!services) throw new Error("Services required for router");
    if (!middleware) throw new Error("Middleware required for router");
    if (!utils) throw new Error("Utils required for router");
    if (!logger) throw new Error("Logger required for router");
    if (!config) throw new Error("Config required for router");

    const router = express.Router();

    router.use(
        "/api/auth",
        createAuthRouter({
            middleware,
            utils,
            logger,
            config,
            errors,
            validators,
            models,
        }),
    );

    router.use(
        "/api/calendars",
        createCalendarRouter({
            models,
            services,
            middleware,
            utils,
            logger,
            errors,
            validators,
        }),
    );

    router.use(
        "/api/settings",
        createSettingsRouter({
            services,
            middleware,
            utils,
            logger,
            errors,
            validators,
            models,
        }),
    );

    router.use("/", createGeneralRouter({ utils, db }));

    router.use(notFoundHandler({ logger, utils }));

    router.use(errorHandler({ logger, utils, config, errors }));

    return router;
}
