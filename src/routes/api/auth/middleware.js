export function createAuthMiddleware(dependencies = {}) {
    const { utils, logger, config, errors } = dependencies;

    if (!utils) throw new Error("Utils required for auth middleware");
    if (!logger) throw new Error("Logger required for auth middleware");
    if (!config) throw new Error("Config required for auth middleware");
    if (!errors) throw new Error("Errors required for auth middleware");

    const { AuthenticationError } = errors;

    return {
        requireAuth() {
            return (req, _res, next) => {
                const token = req.cookies?.session_token || null;

                if (!token || !utils.validateSessionToken(token)) {
                    throw new AuthenticationError();
                }

                next();
            };
        },
    };
}
