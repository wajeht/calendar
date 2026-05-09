import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { createContext } from "./context.js";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { contextStorage } from "hono/context-storage";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { etag } from "hono/etag";
import { HTTPException } from "hono/http-exception";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { rateLimiter } from "hono-rate-limiter";
import { createRouter, errorHandler, notFoundHandler } from "./api/index.js";
import { parseByteLimit } from "./api/http.js";

const publicRoot = fileURLToPath(new URL("../public", import.meta.url));

function createSecurityHeaders(config) {
    return secureHeaders({
        ...(config.security?.contentSecurityPolicy !== false && {
            contentSecurityPolicy: {
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
        }),
        strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
        xContentTypeOptions: "nosniff",
        xFrameOptions: "DENY",
        xXssProtection: "1; mode=block",
        referrerPolicy: "strict-origin-when-cross-origin",
        crossOriginEmbedderPolicy: false,
    });
}

export async function createApp(customConfig = {}) {
    const ctx = createContext(customConfig);

    const app = new Hono({ strict: false });

    if (ctx.config.cors?.origin) {
        app.use(
            "*",
            cors({
                origin: ctx.config.cors.origin,
                credentials: !!ctx.config.cors.credentials,
            }),
        );
    }

    app.use("*", contextStorage());
    app.use("*", createSecurityHeaders(ctx.config));
    app.use("*", requestId());
    app.use(
        "*",
        honoLogger((message, ...rest) => {
            ctx.logger.info("request", { message: [message, ...rest].join(" ") });
        }),
    );
    app.use(
        "*",
        compress({
            threshold: ctx.config.compression?.threshold || 1024,
        }),
    );
    app.use("*", etag());
    app.use("/api/*", prettyJSON());
    app.use("/api/*", csrf());
    app.use(
        "*",
        rateLimiter({
            windowMs: ctx.config.rateLimit?.windowMs || 15 * 60 * 1000,
            limit: ctx.config.rateLimit?.max || 1000,
            standardHeaders: ctx.config.rateLimit?.standardHeaders === false ? false : "draft-6",
            skipSuccessfulRequests: !!ctx.config.rateLimit?.skipSuccessfulRequests,
            skipFailedRequests: !!ctx.config.rateLimit?.skipFailedRequests,
            skip: () => ctx.config.app.env !== "production",
            keyGenerator: (c) =>
                c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
                c.req.header("x-real-ip") ||
                c.env?.incoming?.socket?.remoteAddress ||
                "unknown",
            message: {
                message: "Too many requests, please try again later.",
            },
        }),
    );
    app.use(
        "/api/*",
        bodyLimit({
            maxSize: Math.max(
                parseByteLimit(ctx.config.app.jsonLimit),
                parseByteLimit(ctx.config.app.urlEncodedLimit),
            ),
            onError: (c) =>
                c.json(
                    {
                        success: false,
                        message: "Request body too large",
                        errors: { body: "Request body too large" },
                        data: null,
                    },
                    413,
                ),
        }),
    );
    app.use(
        "/api/*",
        timeout(
            ctx.config.timeouts?.server || 120000,
            new HTTPException(408, { message: "Request timed out" }),
        ),
    );
    app.use("*", async (c, next) => {
        if (ctx.config.app.env === "production" && c.req.header("x-forwarded-proto") !== "https") {
            const url = new URL(c.req.url);
            return c.redirect(`https://${c.req.header("host")}${url.pathname}${url.search}`);
        }

        await next();
    });
    app.use(
        "*",
        serveStatic({
            root: publicRoot,
            onFound: (path, c) => {
                const extensionPattern = new RegExp(
                    `\\.(${ctx.config.cache.staticExtensions.join("|")})$`,
                );

                if (ctx.config.app.env === "production" && path.match(extensionPattern)) {
                    c.header("Cache-Control", "public, max-age=31536000, immutable");
                    c.header("Vary", "Accept-Encoding", { append: true });
                    return;
                }

                c.header("Cache-Control", "public, max-age=0");
            },
        }),
    );
    app.route(
        "/",
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
    app.notFound(notFoundHandler({ logger: ctx.logger, utils: ctx.utils, errors: ctx.errors }));
    app.onError(
        errorHandler({
            logger: ctx.logger,
            utils: ctx.utils,
            config: ctx.config,
            errors: ctx.errors,
        }),
    );

    return { app, ctx };
}

export async function createServer(customConfig = {}) {
    const { app, ctx } = await createApp(customConfig);
    const PORT = ctx.config.app.port;

    const server = serve({ fetch: app.fetch, port: PORT }, async () => {
        ctx.logger.info("server started", { port: PORT, url: `http://localhost:${PORT}` });

        if (process.env.NODE_ENV !== "test") {
            try {
                await ctx.services.cron.start();
            } catch (error) {
                ctx.logger.error("failed to start cron service", { error: error.message });
            }
        }
    });

    const serverTimeout = ctx.config.timeouts?.server || 120000;
    server.timeout = serverTimeout;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.requestTimeout = serverTimeout;

    server.on("error", (error) => {
        if (error.syscall !== "listen") {
            throw error;
        }

        switch (error.code) {
            case "EACCES":
                ctx.logger.error("port requires elevated privileges", { port: PORT });
                process.exit(1);
                break;
            case "EADDRINUSE":
                ctx.logger.error("port already in use", { port: PORT });
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    return { app, server, ctx };
}

export async function closeServer({ server, ctx }) {
    ctx.logger.info("shutdown initiated");

    try {
        if (process.env.NODE_ENV !== "test") {
            try {
                ctx.services.cron.stop();
                ctx.logger.info("cron service stopped");
            } catch (error) {
                ctx.logger.warn("error stopping cron service", { error: error.message });
            }
        }

        try {
            if (ctx.db && typeof ctx.db.destroy === "function") {
                await ctx.db.destroy();
                ctx.logger.info("database connections closed");
            }
        } catch (error) {
            ctx.logger.warn("error closing database", { error: error.message });
        }

        if (server) {
            const shutdownMs = ctx.config.timeouts?.shutdown || 10000;
            await new Promise((resolve, reject) => {
                server.keepAliveTimeout = 0;
                server.headersTimeout = 0;
                server.timeout = 1;

                const shutdownTimeout = setTimeout(() => {
                    ctx.logger.error("shutdown timeout", { timeout_ms: shutdownMs });
                    reject(new ctx.errors.TimeoutError("Server close timeout", shutdownMs));
                }, shutdownMs);

                server.close((error) => {
                    clearTimeout(shutdownTimeout);
                    if (error) {
                        ctx.logger.error("error closing http server", { error: error.message });
                        reject(error);
                    } else {
                        ctx.logger.info("http server closed");
                        resolve();
                    }
                });
            });
        }

        ctx.logger.info("shutdown complete");
    } catch (error) {
        ctx.logger.error("error during graceful shutdown", { error: error.message });
        process.exit(1);
    }
}
