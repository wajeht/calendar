export function createAuthMiddleware(dependencies = {}) {
    const { utils, logger, config, errors } = dependencies;

    if (!utils) throw new Error('Utils required for auth middleware');
    if (!logger) throw new Error('Logger required for auth middleware');
    if (!config) throw new Error('Config required for auth middleware');
    if (!errors) throw new Error('Errors required for auth middleware');

    const { AuthenticationError } = errors;

    return {
        requireAuth() {
            return (req, res, next) => {
                const token = req.cookies?.session_token || null;

                if (!token) {
                    throw new AuthenticationError();
                }

                try {
                    const [timestamp] = token.split('.');
                    const tokenTime = parseInt(timestamp);
                    const now = Date.now();
                    const twentyFourHours = 24 * 60 * 60 * 1000;

                    if ((now - tokenTime) >= twentyFourHours) {
                        throw new AuthenticationError();
                    }
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        throw error;
                    }
                    throw new AuthenticationError();
                }

                next();
            };
        },
    };
}
