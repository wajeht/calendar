import ejs from 'ejs';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';
import { createRouter } from './routes/routes.js';
import { createContext } from './context.js';

export async function createServer(customConfig = {}) {
    const ctx = createContext(customConfig);
    const PORT = ctx.config.app.port;

    const app = express()
        .use(cors())
        .use(helmet())
        .use(compression())
        .use(express.json({ limit: '1mb' }))
        .use(express.urlencoded({ extended: true, limit: '1mb' }))
        .engine('html', ejs.renderFile)
        .set('view engine', 'html')
        .set('view cache', ctx.config.app.env === 'production')
        .set('views', './src/routes')

    app.get('/health', (_req, res) => res.status(200).json({ message: "ok" }));
    app.use('/api', createRouter(ctx));

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

