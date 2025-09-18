import express from 'express';

export function createAuthRouter(dependencies = {}) {
    const { middleware, utils, logger, config, errors, validators } = dependencies;

    if (!middleware) throw new Error('Middleware required for auth router');
    if (!utils) throw new Error('Utils required for auth router');
    if (!logger) throw new Error('Logger required for auth router');
    if (!config) throw new Error('Config required for auth router');
    if (!errors) throw new Error('Errors required for auth router');
    if (!validators) throw new Error('Validators required for auth router');

    const { ValidationError } = errors;

    const router = express.Router();
    const requireAuth = middleware.auth.requireAuth();

    router.post('/', async (req, res) => {
        validators.validateBody(req.body);
        const { password } = req.body;

        if (!password) {
            throw new ValidationError('Password is required', 'password');
        }

        if (password !== config.auth.password) {
            logger.warn('Failed login attempt');
            throw new ValidationError('Invalid password', 'password');
        }

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const sessionToken = `${timestamp}.${random}`;

        res.cookie('session_token', sessionToken, {
            httpOnly: true,
            secure: config.app.env === 'production', // Only require HTTPS in production
            sameSite: 'strict', // Stricter CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/', // Explicit path
            domain: config.auth.cookieDomain
        });

        logger.info('Successful login');
        res.json({
            success: true,
            message: 'Authentication successful'
        });
    });

    router.post('/logout', (req, res) => {
        res.clearCookie('session_token', {
            httpOnly: true,
            secure: config.app.env === 'production',
            sameSite: 'strict',
            path: '/',
            domain: config.auth.cookieDomain
        });

        logger.info('User logged out');
        res.json({ success: true, message: 'Logged out successfully' });
    });

    router.get('/verify', requireAuth, (req, res) => {
        res.json({
            success: true,
            message: 'Session is valid'
        });
    });

    return router;
}
