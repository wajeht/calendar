import crypto from "node:crypto";
import express from "express";

export function createAuthRouter(dependencies = {}) {
    const { middleware, utils, logger, config, errors, validators, models, services } =
        dependencies;

    if (!errors) throw new Error("Errors required for auth router");
    const { ConfigurationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for auth router");
    if (!logger) throw new ConfigurationError("Logger required for auth router");
    if (!config) throw new ConfigurationError("Config required for auth router");
    if (!models) throw new ConfigurationError("Models required for auth router");
    if (!services) throw new ConfigurationError("Services required for auth router");
    if (!validators) throw new ConfigurationError("Validators required for auth router");
    if (!middleware) throw new ConfigurationError("Middleware required for auth router");

    const { ValidationError } = errors;

    const router = express.Router();
    const requireAuth = middleware.auth.requireAuth();
    const contextCache = new Map();
    const publicContextSettingKeys = ["app_password"];
    const authContextSettingKeys = [
        "app_password",
        "theme",
        "feed_token",
        "feed_calendars",
        "cron_settings",
    ];

    function getContextSettingKeys(isAuthenticated) {
        return isAuthenticated ? authContextSettingKeys : publicContextSettingKeys;
    }

    function hashContextVersion(parts) {
        return `ctx_${crypto.createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 24)}`;
    }

    async function getContextVersion(isAuthenticated) {
        const [calendarVersion, settingsVersion] = await Promise.all([
            models.calendar.getAccessVersion(isAuthenticated),
            models.settings.getVersion(getContextSettingKeys(isAuthenticated)),
        ]);
        const access = isAuthenticated ? "auth" : "public";

        return hashContextVersion([
            access,
            calendarVersion,
            settingsVersion,
            isAuthenticated ? JSON.stringify(services.cron.getStatus()) : "",
        ]);
    }

    async function buildSettingsContext(isAuthenticated, version) {
        const settings = await models.settings.getMany(getContextSettingKeys(isAuthenticated));
        const data = {
            isAuthenticated,
            isPasswordConfigured: !!settings.app_password,
            access: isAuthenticated ? "auth" : "public",
            version,
        };

        if (isAuthenticated) {
            data.cronSettings = services.cron.getStatus();
            data.theme = settings.theme || "system";

            if (settings.feed_token) {
                data.feedToken = {
                    token: settings.feed_token,
                    feedUrl: `/api/feed/${settings.feed_token}.ics`,
                    calendars: settings.feed_calendars || [],
                };
            }
        }

        return data;
    }

    async function buildUserContext(isAuthenticated, version) {
        const cacheKey = `${isAuthenticated ? "auth" : "public"}:${version}`;
        if (contextCache.has(cacheKey)) {
            return contextCache.get(cacheKey);
        }

        const [settingsContext, calendars] = await Promise.all([
            buildSettingsContext(isAuthenticated, version),
            models.calendar.getAllForAccess(isAuthenticated),
        ]);
        const data = { ...settingsContext, calendars };

        contextCache.set(cacheKey, data);
        if (contextCache.size > 8) {
            contextCache.delete(contextCache.keys().next().value);
        }

        return data;
    }

    router.post("/", async (req, res) => {
        validators.validateBody(req.body);

        const { password } = req.body;

        if (!password) {
            throw new ValidationError({ password: "Password is required" });
        }

        const failedAttempts = parseInt(req.cookies.failed_attempts || "0");
        const lockedUntil = parseInt(req.cookies.locked_until || "0");

        if (lockedUntil && Date.now() < lockedUntil) {
            const timeLeft = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
            logger.warn("login attempt on locked session", { minutes_remaining: timeLeft });
            throw new ValidationError({
                password: `Account locked. Try again in ${timeLeft} minutes`,
            });
        }

        const currentPasswordHash = await models.settings.get("app_password");

        if (!currentPasswordHash) {
            throw new ValidationError({ password: "Application password not configured" });
        }

        const isPasswordValid = await utils.verifyPassword(password, currentPasswordHash);
        if (!isPasswordValid) {
            const newFailedAttempts = failedAttempts + 1;

            if (newFailedAttempts >= 5) {
                const lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
                res.cookie("locked_until", lockUntil.toString(), {
                    httpOnly: true,
                    secure: config.app.env === "production",
                    sameSite: "strict",
                    maxAge: 15 * 60 * 1000, // 15 minutes
                    path: "/",
                });
                logger.warn("account locked after failed attempts", { attempts: 5 });
                throw new ValidationError({
                    password: "Too many failed attempts. Account locked for 15 minutes",
                });
            }

            res.cookie("failed_attempts", newFailedAttempts.toString(), {
                httpOnly: true,
                secure: config.app.env === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 1000, // 1 hour
                path: "/",
            });

            logger.warn("failed login attempt", { attempt: newFailedAttempts, max_attempts: 5 });
            throw new ValidationError({ password: "Invalid password" });
        }

        res.clearCookie("failed_attempts", { path: "/" });
        res.clearCookie("locked_until", { path: "/" });

        const sessionToken = `${Date.now()}.${utils.generateSecureToken(16)}`;
        const now = Date.now();

        const cookieOptions = {
            httpOnly: true,
            secure: config.app.env === "production",
            sameSite: "strict",
            path: "/",
            ...(config.auth.cookieDomain && { domain: config.auth.cookieDomain }),
        };

        res.cookie("session_token", sessionToken, {
            ...cookieOptions,
            maxAge: config.auth.absoluteTimeout,
        });
        res.cookie("session_activity", String(now), {
            ...cookieOptions,
            maxAge: config.auth.idleTimeout,
        });

        logger.info("login successful");
        res.json({
            success: true,
            message: "Authentication successful",
            errors: null,
            data: null,
        });
    });

    router.post("/logout", (_req, res) => {
        const cookieOptions = {
            httpOnly: true,
            secure: config.app.env === "production",
            sameSite: "strict",
            path: "/",
            ...(config.auth.cookieDomain && { domain: config.auth.cookieDomain }),
        };

        res.clearCookie("session_token", cookieOptions);
        res.clearCookie("session_activity", cookieOptions);

        logger.info("user logged out");
        res.json({
            success: true,
            message: "Logged out successfully",
            errors: null,
            data: null,
        });
    });

    router.get("/me", async (req, res) => {
        const isAuthenticated = utils.isAuthenticated(req);
        const version = await getContextVersion(isAuthenticated);
        const clientVersion = typeof req.query.version === "string" ? req.query.version : null;

        const data =
            clientVersion && clientVersion === version
                ? {
                      ...(await buildSettingsContext(isAuthenticated, version)),
                      notModified: true,
                  }
                : await buildUserContext(isAuthenticated, version);

        res.json({
            success: true,
            message: "User context retrieved successfully",
            errors: null,
            data,
        });
    });

    router.post("/password", async (req, res) => {
        validators.validateBody(req.body);

        const { password, confirmPassword } = req.body;

        if (!password) {
            throw new ValidationError({
                password: "Password is required",
            });
        }

        if (!confirmPassword) {
            throw new ValidationError({
                confirmPassword: "Password confirmation is required",
            });
        }

        if (password !== confirmPassword) {
            throw new ValidationError({
                confirmPassword: "Passwords do not match",
            });
        }

        if (password.length < 8) {
            throw new ValidationError({
                password: "Password must be at least 8 characters long",
            });
        }

        const existingPassword = await models.settings.get("app_password");
        if (existingPassword) {
            throw new ValidationError({
                password: "Application password is already configured",
            });
        }

        const hashedPassword = await utils.hashPassword(password);
        await models.settings.set("app_password", hashedPassword);

        logger.info("initial password configured");

        res.json({
            success: true,
            message: "Password configured successfully",
            errors: null,
            data: null,
        });
    });

    router.put("/password", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword) {
            throw new ValidationError({
                currentPassword: currentPassword ? undefined : "Current password is required",
                newPassword: newPassword ? undefined : "New password is required",
            });
        }

        if (!confirmPassword) {
            throw new ValidationError({
                confirmPassword: "Password confirmation is required",
            });
        }

        if (newPassword !== confirmPassword) {
            throw new ValidationError({
                confirmPassword: "Passwords do not match",
            });
        }

        if (newPassword.length < 8) {
            throw new ValidationError({
                newPassword: "New password must be at least 8 characters long",
            });
        }

        const storedPasswordHash = await models.settings.get("app_password");
        if (!storedPasswordHash) {
            throw new ValidationError({
                currentPassword: "Application password not configured",
            });
        }

        const isCurrentPasswordValid = await utils.verifyPassword(
            currentPassword,
            storedPasswordHash,
        );
        if (!isCurrentPasswordValid) {
            throw new ValidationError({
                currentPassword: "Current password is incorrect",
            });
        }

        const hashedNewPassword = await utils.hashPassword(newPassword);
        await models.settings.set("app_password", hashedNewPassword);

        logger.info("password changed");

        res.json({
            success: true,
            message: "Password changed successfully",
            errors: null,
            data: null,
        });
    });

    return router;
}
