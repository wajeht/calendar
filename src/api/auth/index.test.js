import { setupTestServer, setupAuthenticatedTestServer } from "../../utils/test-utils.js";
import { describe, it, beforeAll, expect } from "vitest";

describe("Auth", () => {
    const server = setupTestServer();
    const authServer = setupAuthenticatedTestServer();

    describe("POST /api/auth", () => {
        it("should login successfully with correct password", async () => {
            const response = await server.post("/api/auth", {
                password: "test-password",
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Authentication successful");

            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeTruthy();
            expect(cookies.some((cookie) => cookie.includes("session_token"))).toBe(true);
        });

        it("should reject login with wrong password", async () => {
            const response = await server.post("/api/auth", {
                password: "wrong-password",
            });

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
            expect(response.body.message.includes("Invalid password")).toBe(true);
        });

        it("should reject login with missing password", async () => {
            const response = await server.post("/api/auth", {});

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
            expect(response.body.message.includes("Password is required")).toBe(true);
        });
    });

    describe("GET /api/auth/me", () => {
        it("should return user context when authenticated", async () => {
            await server.login();

            const response = await server.get("/api/auth/me");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("User context retrieved successfully");
            expect(response.body.data).toBeDefined();
            expect(response.body.data.isAuthenticated).toBe(true);
            expect(response.body.data.isPasswordConfigured).toBe(true);
            expect(response.body.data.calendars).toBeDefined();
            expect(Array.isArray(response.body.data.calendars)).toBe(true);
            expect(response.body.data.cronSettings).toBeDefined();
        });

        it("should return user context when not authenticated", async () => {
            await server.logout();

            const response = await server.get("/api/auth/me");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.isAuthenticated).toBe(false);
            expect(response.body.data.isPasswordConfigured).toBe(true);
            expect(response.body.data.calendars).toBeDefined();
            expect(Array.isArray(response.body.data.calendars)).toBe(true);
            expect(response.body.data.cronSettings).toBeUndefined();

            await server.login();
        });

        it("should include cron settings only when authenticated", async () => {
            await server.login();
            const authResponse = await server.get("/api/auth/me");
            expect(authResponse.body.data.cronSettings).toBeDefined();

            await server.logout();
            const unauthResponse = await server.get("/api/auth/me");
            expect(unauthResponse.body.data.cronSettings).toBeUndefined();

            await server.login();
        });
    });

    describe("POST /api/auth/logout", () => {
        it("should logout successfully", async () => {
            const response = await server.post("/api/auth/logout");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Logged out successfully");

            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeTruthy();
            expect(cookies.some((cookie) => cookie.includes("session_token=;"))).toBe(true);
        });
    });

    describe("Full Auth Flow", () => {
        it("should complete login -> me -> logout flow", async () => {
            const sessionToken = await server.login();
            expect(sessionToken).toBeTruthy();

            const meResponse = await server.get("/api/auth/me");
            expect(meResponse.status).toBe(200);
            expect(meResponse.body.data.isAuthenticated).toBe(true);

            await server.logout();

            const loggedOutMeResponse = await server.get("/api/auth/me");
            expect(loggedOutMeResponse.status).toBe(200);
            expect(loggedOutMeResponse.body.data.isAuthenticated).toBe(false);
        });
    });

    describe("POST /api/auth/password", () => {
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

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Password configured successfully");
        });

        it("should reject setup when password already configured", async () => {
            const passwordData = {
                password: "another-password",
                confirmPassword: "another-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing password", async () => {
            await testServer.ctx.models.settings.set("app_password", null);

            const passwordData = {
                confirmPassword: "test-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                password: "test-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject mismatched passwords", async () => {
            const passwordData = {
                password: "test-password",
                confirmPassword: "different-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject short password", async () => {
            const passwordData = {
                password: "short",
                confirmPassword: "short",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });
    });

    describe("PUT /api/auth/password", () => {
        it("should change password with valid credentials", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-test-password-123",
                confirmPassword: "new-test-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

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

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing current password", async () => {
            const passwordData = {
                newPassword: "new-password-123",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing new password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors).toBeTruthy();
            expect(response.body.errors.newPassword).toBeTruthy();
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject mismatched new passwords", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
                confirmPassword: "different-password",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject short new password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "short",
                confirmPassword: "short",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should require authentication", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
                confirmPassword: "new-password-123",
            };

            const response = await server.put("/api/auth/password", passwordData);

            expect(response.status).toBe(401);
        });
    });
});
