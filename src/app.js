import ejs from 'ejs';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createContext } from './context.js';
import { rateLimit } from 'express-rate-limit';
import { createRouter } from './routes/routes.js';

export async function createServer(customConfig = {}) {
    const ctx = createContext(customConfig);
    const PORT = ctx.config.app.port;

    const app = express()
        .use(cors(ctx.config.cors || {}))
        .use(helmet({
            ...ctx.config.security,
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net"],
                    scriptSrcAttr: ["'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            crossOriginEmbedderPolicy: false
        }))
        .use(compression(ctx.config.compression || {}))
        .use(rateLimit({
            ...ctx.config.rateLimit,
            handler: async (req, res) => {
                if (ctx.utils.isApiRequest(req)) {
                    return res.json({ message: 'Too many requests, please try again later.' });
                }
                return res.status(429).render('general/rate-limit.html', {
                    copyrightYear: new Date().getFullYear(),
                });
            },
            skip: (_req, _res) => ctx.config.app.env !== 'production',
        }))
        .use((req, res, next) => {
            if (ctx.config.app.env === 'production' && req.header('x-forwarded-proto') !== 'https') {
                return res.redirect(`https://${req.header('host')}${req.url}`);
            }

            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

            next();
        })
        .use(cookieParser())
        .use(express.json({ limit: ctx.config.app.jsonLimit || '1mb' }))
        .use(express.urlencoded({
            extended: true,
            limit: ctx.config.app.urlEncodedLimit || '1mb'
        }))
        .use(express.static('./public', {
            maxAge: ctx.config.app.env === 'production' ? ctx.config.cache.staticMaxAge : '0',
            etag: true,
            lastModified: true,
            immutable: ctx.config.app.env === 'production' && ctx.config.cache.staticImmutable,
            setHeaders: (res, path, _stat) => {
                const extensionPattern = new RegExp(`\\.(${ctx.config.cache.staticExtensions.join('|')})$`);
                if (ctx.config.app.env === 'production' && path.match(extensionPattern)) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    res.setHeader('Vary', 'Accept-Encoding');
                }
            }
        }))
        .engine('html', ejs.renderFile)
        .set('view engine', 'html')
        .set('view cache', ctx.config.app.env === 'production')
        .set('views', './src/routes')
        .use((_req, res, next) => {
            const originalRender = res.render;
            res.render = function (view, viewOptions = {}, callback) {
                const layout = viewOptions.layout === false ? false : viewOptions.layout || '_layouts/public.html';
                const options = { ...viewOptions };

                if (!layout) return originalRender.call(this, view, options, callback);

                originalRender.call(this, view, options, (err, html) => {
                    if (err) return callback ? callback(err) : next(err);
                    originalRender.call(this, layout, { ...options, body: html, layout: undefined }, callback);
                });
            };
            next();
        })

    app.get('/health', (_req, res) => res.status(200).json({ message: "ok" }));

    app.use('/', createRouter({
        models: ctx.models,
        services: ctx.services,
        middleware: ctx.middleware,
        utils: ctx.utils,
        logger: ctx.logger,
        config: ctx.config,
        errors: ctx.errors,
        validators: ctx.validators
    }));

    const server = app.listen(PORT);

    server.timeout = 120000; // 2 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // slightly higher than keepAliveTimeout
    server.requestTimeout = 120000; // same as timeout

    server.on('listening', () => {
        ctx.logger.success(`Server running on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

        switch (error.code) {
            case 'EACCES':
                ctx.logger.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
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
    ctx.logger.info('Shutting down server gracefully...');

    let shutdownComplete = false;

    if (server) {
        server.keepAliveTimeout = 0;
        server.headersTimeout = 0;
        server.timeout = 1;

        server.close(() => {
            ctx.logger.info('HTTP server closed.');
            shutdownComplete = true;
            ctx.logger.success('Server shutdown complete');
        });

        setTimeout(() => {
            if (!shutdownComplete) {
                ctx.logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }
        }, 10000);
    } else {
        ctx.logger.success('Server shutdown complete');
    }
}
