import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { toCookieOptions } from "../http.js";

export function createAuthMiddleware(dependencies = {}) {
    const { utils, errors, config } = dependencies;

    if (!errors) throw new Error("Errors required for auth middleware");
    const { ConfigurationError, AuthenticationError } = errors;

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
            return createMiddleware(async (c, next) => {
                const token = getCookie(c, "session_token") || null;
                const lastActivity = getCookie(c, "session_activity") || null;

                if (!token || !utils.validateSessionToken(token, lastActivity)) {
                    throw new AuthenticationError();
                }

                // Sliding session: extend cookies on each authenticated request
                const now = Date.now();
                setCookie(
                    c,
                    "session_token",
                    token,
                    toCookieOptions({
                        ...cookieOptions,
                        maxAge: config.auth.absoluteTimeout,
                    }),
                );
                setCookie(
                    c,
                    "session_activity",
                    String(now),
                    toCookieOptions({
                        ...cookieOptions,
                        maxAge: config.auth.idleTimeout,
                    }),
                );

                await next();
            });
        },
    };
}
