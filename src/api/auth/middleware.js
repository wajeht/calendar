export function createAuthMiddleware(dependencies = {}) {
    const { utils, errors, config } = dependencies;

    if (!errors) throw new Error("Errors required for auth middleware");
    const { ConfigurationError, AuthenticationError, ValidationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for auth middleware");
    if (!config) throw new ConfigurationError("Config required for auth middleware");

    const cookieOptions = {
        httpOnly: true,
        secure: config.app.env === "production",
        sameSite: "strict",
        path: "/",
        ...(config.auth.cookieDomain && { domain: config.auth.cookieDomain }),
    };

    return {
        requireAuth() {
            return (req, res, next) => {
                const token = req.cookies?.session_token || null;
                const lastActivity = req.cookies?.session_activity || null;

                if (!token || !utils.validateSessionToken(token, lastActivity)) {
                    throw new AuthenticationError();
                }

                // Sliding session: extend cookies on each authenticated request
                const now = Date.now();
                res.cookie("session_token", token, {
                    ...cookieOptions,
                    maxAge: config.auth.absoluteTimeout,
                });
                res.cookie("session_activity", String(now), {
                    ...cookieOptions,
                    maxAge: config.auth.idleTimeout,
                });

                next();
            };
        },

        verifyCaptcha() {
            return async (req, _res, next) => {
                if (!utils.isCapEnabled()) {
                    return next();
                }

                const { capToken } = req.body || {};
                if (!capToken) {
                    throw new ValidationError({
                        password: "Captcha verification failed: Missing token",
                    });
                }

                const outcome = await utils.verifyCapToken(capToken);
                if (!outcome.success) {
                    throw new ValidationError({ password: "Captcha verification failed" });
                }

                next();
            };
        },
    };
}
