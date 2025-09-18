import ejs from 'ejs';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { createRouter } from './routes/routes.js';
import { createContext } from './context.js';
import { layoutMiddleware } from './routes/middleware.js';

export async function createServer(customConfig = {}) {
    const ctx = createContext(customConfig);
    const PORT = ctx.config.app.port;

    const app = express()
        .use(cors(ctx.config.cors || {}))
        // .use(helmet(ctx.config.security || {}))
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
        .use(cookieParser())
        .use(express.json({ limit: ctx.config.app.jsonLimit || '1mb' }))
        .use(express.urlencoded({
            extended: true,
            limit: ctx.config.app.urlEncodedLimit || '1mb'
        }))
        .use(express.static('./public'))
        .engine('html', ejs.renderFile)
        .set('view engine', 'html')
        .set('view cache', ctx.config.app.env === 'production')
        .set('views', './src/routes')
        .use(layoutMiddleware({
            defaultLayout: '_layouts/public.html',
            layoutsDir: '_layouts'
        }))

    app.get('/health', (_req, res) => res.status(200).json({ message: "ok" }));

    app.use('/', createRouter(ctx));

    const server = app.listen(PORT);
    ctx.logger.success(`Server running on http://localhost:${PORT}`);

    return { app, server, ctx };
}

export async function closeServer({ server, ctx }) {
    ctx.logger.info('Shutting down server...');

    if (server) {
        server.close();
    }

    ctx.logger.success('Server shutdown complete');
}
