import express from 'express';

export function createAuthRouter(ctx) {
    const router = express.Router();

    const requireAuth = ctx.middleware.auth.requireAuth();

    router.post('/', async (req, res) => {
        try {
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ success: false, error: 'Password is required' });
            }

            if (!ctx.utils.auth.validatePassword(password)) {
                ctx.logger.warn('Failed login attempt');
                return res.status(401).json({ success: false, error: 'Invalid password' });
            }

            res.cookie('session_token', ctx.utils.auth.generateSessionToken(), {
                httpOnly: true,
                secure: ctx.config.app.env === 'production', // Only require HTTPS in production
                sameSite: 'strict', // Stricter CSRF protection
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                path: '/', // Explicit path
                domain: ctx.config.auth.cookieDomain
            });

            ctx.logger.info('Successful login');
            res.json({
                success: true,
                message: 'Authentication successful'
            });

        } catch (error) {
            ctx.logger.error('Error during authentication:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    router.post('/logout', (req, res) => {
        res.clearCookie('session_token', {
            httpOnly: true,
            secure: ctx.config.app.env === 'production',
            sameSite: 'strict',
            path: '/',
            domain: ctx.config.auth.cookieDomain
        });

        ctx.logger.info('User logged out');
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
