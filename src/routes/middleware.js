export function layoutMiddleware(options = {}) {
    const defaultOptions = {
        defaultLayout: '_layouts/public.html',
        layoutsDir: '_layouts',
        ...options,
    };

    return (_req, res, next) => {
        const originalRender = res.render;

        res.render = function (view, viewOptions = {}, callback) {
            const layout =
                viewOptions.layout === false
                    ? false
                    : viewOptions.layout || defaultOptions.defaultLayout;
            const options = { ...viewOptions };

            if (!layout) {
                return originalRender.call(this, view, options, callback);
            }

            originalRender.call(this, view, options, (err, html) => {
                if (err) return callback ? callback(err) : next(err);

                const layoutOptions = {
                    ...options,
                    body: html,
                };

                delete layoutOptions.layout;

                originalRender.call(this, layout, layoutOptions, callback);
            });
        };

        next();
    };
}

/**
 * Creates auth middleware factory with dependency injection
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.utils - Utils object with auth methods
 * @param {Object} dependencies.logger - Logger instance
 * @returns {Object} - Auth middleware collection
 */
export function createAuthMiddleware(dependencies = {}) {
    const { utils, logger } = dependencies;

    return {
        /**
         * Authentication middleware that requires valid session token
         * @returns {Function} - Express middleware function
         */
        requireAuth() {
            return (req, res, next) => {
                const token = utils.auth.extractSessionToken(req);

                if (!utils.auth.validateSessionToken(token)) {
                    return res.status(401).json({ success: false, error: 'Access token required' });
                }

                next();
            };
        },

        /**
         * Optional authentication middleware for pages that can work with or without auth
         * @returns {Function} - Express middleware function
         */
        optionalAuth() {
            return (req, res, next) => {
                const token = utils.auth.extractSessionToken(req);
                req.authenticated = utils.auth.validateSessionToken(token);
                next();
            };
        },

    };
}
