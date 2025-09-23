import { describe, it, beforeAll, expect } from "vitest";
import { setupTestServer, setupAuthenticatedTestServer } from "../../utils/test-utils.js";

describe("Settings", () => {
    const authServer = setupAuthenticatedTestServer();
    const server = setupTestServer();

    describe("GET /api/settings/cron", () => {
        it("should get cron settings when authenticated", async () => {
            const response = await authServer.get("/api/settings/cron");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Cron settings retrieved successfully");
            expect(response.body.errors).toBe(null);
            expect(typeof response.body.data.enabled).toBe("boolean");
            expect(response.body.data.schedule).toBeDefined();
        });

        it("should require authentication", async () => {
            const response = await server.get("/api/settings/cron");

            expect(response.status).toBe(401);
        });
    });

    describe("PUT /api/settings/cron", () => {
        it("should update cron settings with valid data", async () => {
            const cronData = {
                enabled: true,
                schedule: "0 */6 * * *",
            };

            const response = await authServer.put("/api/settings/cron", cronData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.enabled).toBe(true);
            expect(response.body.data.schedule).toBe("0 */6 * * *");
        });

        it("should disable cron without schedule", async () => {
            const cronData = {
                enabled: false,
            };

            const response = await authServer.put("/api/settings/cron", cronData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.enabled).toBe(false);
        });

        it("should reject invalid enabled value", async () => {
            const cronData = {
                enabled: "invalid",
            };

            const response = await authServer.put("/api/settings/cron", cronData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject enabled true without schedule", async () => {
            const cronData = {
                enabled: true,
            };

            const response = await authServer.put("/api/settings/cron", cronData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject invalid cron schedule format", async () => {
            const cronData = {
                enabled: true,
                schedule: "invalid cron",
            };

            const response = await authServer.put("/api/settings/cron", cronData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should require authentication", async () => {
            const cronData = {
                enabled: true,
                schedule: "0 */6 * * *",
            };

            const response = await server.put("/api/settings/cron", cronData);

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/settings/password-configured", () => {
        it("should check password configuration status", async () => {
            const response = await server.get("/api/settings/password-configured");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Password configuration status retrieved successfully",
            );
            expect(response.body.errors).toBe(null);
            expect(typeof response.body.data.configured).toBe("boolean");
        });

        it("should not require authentication", async () => {
            const response = await server.get("/api/settings/password-configured");

            expect(response.status).toBe(200);
        });
    });

    describe("POST /api/settings/setup-password", () => {
        let testServer;

        beforeAll(async () => {
            const { createTestServer } = await import("../../utils/test-utils.js");
            testServer = await createTestServer();
            await testServer.ctx.models.settings.set("app_password", null);
        });

        it("should setup initial password successfully", async () => {
            const passwordData = {
                password: "test-password-123",
                confirmPassword: "test-password-123",
            };

            const response = await testServer.post("/api/settings/setup-password", passwordData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Password configured successfully");
        });

        it("should reject setup when password already configured", async () => {
            const passwordData = {
                password: "another-password",
                confirmPassword: "another-password",
            };

            const response = await testServer.post("/api/settings/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing password", async () => {
            await testServer.ctx.models.settings.set("app_password", null);

            const passwordData = {
                confirmPassword: "test-password",
            };

            const response = await testServer.post("/api/settings/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                password: "test-password",
            };

            const response = await testServer.post("/api/settings/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject mismatched passwords", async () => {
            const passwordData = {
                password: "test-password",
                confirmPassword: "different-password",
            };

            const response = await testServer.post("/api/settings/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject short password", async () => {
            const passwordData = {
                password: "short",
                confirmPassword: "short",
            };

            const response = await testServer.post("/api/settings/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });
    });

    describe("PUT /api/settings/password", () => {
        it("should change password with valid credentials", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-test-password-123",
                confirmPassword: "new-test-password-123",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Password changed successfully");
        });

        it("should reject wrong current password", async () => {
            const passwordData = {
                currentPassword: "wrong-password",
                newPassword: "new-password-123",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing current password", async () => {
            const passwordData = {
                newPassword: "new-password-123",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing new password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors).toBeTruthy();
            expect(response.body.errors.newPassword).toBeTruthy();
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject mismatched new passwords", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
                confirmPassword: "different-password",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject short new password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "short",
                confirmPassword: "short",
            };

            const response = await authServer.put("/api/settings/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should require authentication", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
                confirmPassword: "new-password-123",
            };

            const response = await server.put("/api/settings/password", passwordData);

            expect(response.status).toBe(401);
        });
    });
});
