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
            logger.warn(`Login attempt on locked session. ${timeLeft} minutes remaining`);
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
                logger.warn(`Account locked after 5 failed attempts`);
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

            logger.warn(`Failed login attempt ${newFailedAttempts}/5`);
            throw new ValidationError({ password: "Invalid password" });
        }

        res.clearCookie("failed_attempts", { path: "/" });
        res.clearCookie("locked_until", { path: "/" });

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const sessionToken = `${timestamp}.${random}`;

        const cookieOptions = {
            httpOnly: true,
            secure: config.app.env === "production", // Only require HTTPS in production
            sameSite: "strict", // Stricter CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: "/", // Explicit path
        };

        if (config.auth.cookieDomain) {
            cookieOptions.domain = config.auth.cookieDomain;
        }

        res.cookie("session_token", sessionToken, cookieOptions);

        logger.info("Successful login");
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
        };

        if (config.auth.cookieDomain) {
            cookieOptions.domain = config.auth.cookieDomain;
        }

        res.clearCookie("session_token", cookieOptions);

        logger.info("User logged out");
        res.json({
            success: true,
            message: "Logged out successfully",
            errors: null,
            data: null,
        });
    });

    router.get("/me", async (req, res) => {
        const isAuthenticated = utils.isAuthenticated(req);
        const existingPassword = await models.settings.get("app_password");
        const calendars = await models.calendar.getAllForAccess(isAuthenticated);

        const data = {
            isAuthenticated,
            isPasswordConfigured: !!existingPassword,
            calendars,
        };

        if (isAuthenticated) {
            data.cronSettings = services.cron.getStatus();
        }

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

        logger.info("Initial application password configured");

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

        logger.info("Application password changed successfully");

        res.json({
            success: true,
            message: "Password changed successfully",
            errors: null,
            data: null,
        });
    });

    return router;
}
