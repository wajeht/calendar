import express from "express";

export function createSettingsRouter(dependencies = {}) {
    const { services, middleware, utils, logger, errors, validators, models } = dependencies;

    if (!services) throw new Error("Services required for settings router");
    if (!middleware) throw new Error("Middleware required for settings router");
    if (!utils) throw new Error("Utils required for settings router");
    if (!logger) throw new Error("Logger required for settings router");
    if (!errors) throw new Error("Errors required for settings router");
    if (!validators) throw new Error("Validators required for settings router");
    if (!models) throw new Error("Models required for settings router");

    const { ValidationError } = errors;

    const router = express.Router();

    const requireAuth = middleware.auth.requireAuth();

    router.get("/cron", requireAuth, async (_req, res) => {
        const status = services.cron.getStatus();
        res.json(status);
    });

    router.put("/cron", requireAuth, async (req, res) => {
        validators.validateBody(req.body);

        const { enabled, schedule } = req.body;

        if (typeof enabled !== "boolean") {
            throw new ValidationError({
                enabled: "Enabled must be a boolean value",
            });
        }

        if (enabled && (!schedule || typeof schedule !== "string")) {
            throw new ValidationError({
                schedule: "Schedule is required when enabling cron",
            });
        }

        if (schedule) {
            const cronParts = schedule.split(" ");
            if (cronParts.length !== 5) {
                throw new ValidationError({
                    schedule:
                        "Invalid cron schedule format. Expected 5 parts (minute hour day month weekday)",
                });
            }
        }

        const result = await services.cron.updateSettings({ enabled, schedule });

        logger.info(`Cron settings updated: enabled=${enabled}, schedule=${schedule}`);

        res.json(result);
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

        const storedPassword = await models.settings.get("app_password");
        if (!storedPassword) {
            throw new ValidationError({
                currentPassword: "Application password not configured",
            });
        }

        if (currentPassword !== storedPassword) {
            throw new ValidationError({
                currentPassword: "Current password is incorrect",
            });
        }

        await models.settings.set("app_password", newPassword);

        logger.info("Application password changed successfully");

        res.json({
            success: true,
            message: "Password changed successfully",
        });
    });

    router.get("/password-configured", async (_req, res) => {
        const existingPassword = await models.settings.get("app_password");
        res.json({
            success: true,
            configured: !!existingPassword,
        });
    });

    router.post("/setup-password", async (req, res) => {
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

        await models.settings.set("app_password", password);

        logger.info("Initial application password configured");

        res.json({
            success: true,
            message: "Password configured successfully",
        });
    });

    return router;
}
