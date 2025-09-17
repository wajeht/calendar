import express from 'express';
import { createRouter } from './routes/routes.js';
import { createContext } from './context.js';

export async function createServer(customConfig = {}) {
    const ctx = createContext(customConfig);
    const PORT = ctx.config.app.port;

    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.status(statusCode).json({ message: "ok" });
    });

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

