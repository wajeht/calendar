import cors from "cors";
import helmet from "helmet";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { createContext } from "./context.js";
import { createRouter } from "./api/index.js";
import { rateLimit } from "express-rate-limit";

export async function createApp(customConfig = {}) {
    const ctx = createContext(customConfig);

    const app = express()
        .use(cors(ctx.config.cors || {}))
        .use(
            helmet({
                ...ctx.config.security,
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: [
                            "'self'",
                            "'unsafe-inline'",
                            "'unsafe-eval'",
                            "cdn.jsdelivr.net",
                            "static.cloudflareinsights.com",
                        ],
                        scriptSrcAttr: ["'unsafe-inline'"],
                        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
                        imgSrc: ["'self'", "data:", "https:"],
                        connectSrc: ["'self'", "cloudflareinsights.com"],
                        fontSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
                        objectSrc: ["'none'"],
                        mediaSrc: ["'self'"],
                        frameSrc: ["'none'"],
                    },
                },
                hsts: {
                    maxAge: 31536000,
                    includeSubDomains: true,
                    preload: true,
                },
                crossOriginEmbedderPolicy: false,
            }),
        )
        .use(
            compression({
                ...ctx.config.compression,
                filter: (req, res) => {
                    if (res.getHeader("Cache-Control")?.includes("no-compress")) {
                        return false;
                    }
                    return compression.filter(req, res);
                },
            }),
        )
        .use(
            rateLimit({
                ...ctx.config.rateLimit,
                handler: async (_req, res) => {
                    return res.status(429).json({
                        message: "Too many requests, please try again later.",
                    });
                },
                skip: (_req, _res) => ctx.config.app.env !== "production",
            }),
        )
        .use((req, res, next) => {
            if (
                ctx.config.app.env === "production" &&
                req.header("x-forwarded-proto") !== "https"
            ) {
                return res.redirect(`https://${req.header("host")}${req.url}`);
            }

            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("X-XSS-Protection", "1; mode=block");
            res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

            next();
        })
        .use((req, res, next) => {
            const start = Date.now();
            const correlationId = `req_${Date.now()}_${Math.floor(Math.random() * 1e9).toString(36)}`;

            req.correlationId = correlationId;
            res.setHeader("X-Correlation-ID", correlationId);

            if (ctx.config.app.env !== "test") {
                ctx.logger.debug(`[${correlationId}] ${req.method} ${req.url}`);
            }

            res.on("finish", () => {
                const duration = Date.now() - start;
                const level = res.statusCode >= 400 ? "warn" : "debug";

                if (ctx.config.app.env !== "test") {
                    ctx.logger[level](
                        `[${correlationId}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`,
                    );
                }
            });

            next();
        })
        .use(cookieParser())
        .use(express.json({ limit: ctx.config.app.jsonLimit || "1mb" }))
        .use(
            express.urlencoded({
                extended: true,
                limit: ctx.config.app.urlEncodedLimit || "1mb",
            }),
        )
        .use(
            express.static("./public", {
                maxAge: ctx.config.app.env === "production" ? ctx.config.cache.staticMaxAge : "0",
                etag: true,
                lastModified: true,
                immutable: ctx.config.app.env === "production" && ctx.config.cache.staticImmutable,
                setHeaders: (res, path, _stat) => {
                    const extensionPattern = new RegExp(
                        `\\.(${ctx.config.cache.staticExtensions.join("|")})$`,
                    );
                    if (ctx.config.app.env === "production" && path.match(extensionPattern)) {
                        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                        res.setHeader("Vary", "Accept-Encoding");
                    }
                },
            }),
        )
        .use(
            createRouter({
                db: ctx.db,
                models: ctx.models,
                services: ctx.services,
                middleware: ctx.middleware,
                utils: ctx.utils,
                logger: ctx.logger,
                config: ctx.config,
                errors: ctx.errors,
                validators: ctx.validators,
            }),
        );

    return { app, ctx };
}

export async function createServer(customConfig = {}) {
    const { app, ctx } = await createApp(customConfig);
    const PORT = ctx.config.app.port;

    const server = app.listen(PORT);

    server.timeout = 120000; // 2 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // slightly higher than keepAliveTimeout
    server.requestTimeout = 120000; // same as timeout

    server.on("listening", async () => {
        ctx.logger.success(`Server running on http://localhost:${PORT}`);

        if (process.env.NODE_ENV !== "test") {
            try {
                await ctx.services.cron.start();
            } catch (error) {
                ctx.logger.error("Failed to start cron service:", error.message);
            }
        }
    });

    server.on("error", (error) => {
        if (error.syscall !== "listen") {
            throw error;
        }

        const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;

        switch (error.code) {
            case "EACCES":
                ctx.logger.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case "EADDRINUSE":
                ctx.logger.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    return { app, server, ctx };
}

export async function closeServer({ server, ctx }) {
    ctx.logger.info("Shutting down server gracefully...");

    try {
        if (process.env.NODE_ENV !== "test") {
            try {
                ctx.services.cron.stop();
                ctx.logger.info("Cron service stopped");
            } catch (error) {
                ctx.logger.warn("Error stopping cron service:", error.message);
            }
        }

        try {
            if (ctx.db && typeof ctx.db.destroy === "function") {
                await ctx.db.destroy();
                ctx.logger.info("Database connections closed");
            }
        } catch (error) {
            ctx.logger.warn("Error closing database:", error.message);
        }

        if (server) {
            await new Promise((resolve, reject) => {
                server.keepAliveTimeout = 0;
                server.headersTimeout = 0;
                server.timeout = 1;

                const shutdownTimeout = setTimeout(() => {
                    ctx.logger.error(
                        "Could not close connections in time, forcefully shutting down",
                    );
                    reject(new ctx.errors.TimeoutError("Server close timeout", 10000));
                }, 10000);

                server.close((error) => {
                    clearTimeout(shutdownTimeout);
                    if (error) {
                        ctx.logger.error("Error closing HTTP server:", error.message);
                        reject(error);
                    } else {
                        ctx.logger.info("HTTP server closed");
                        resolve();
                    }
                });
            });
        }

        ctx.logger.success("Server shutdown complete");
    } catch (error) {
        ctx.logger.error("Error during graceful shutdown:", error.message);
        process.exit(1);
    }
}
