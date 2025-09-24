import { setupTestServer, setupAuthenticatedTestServer } from "../../utils/test-utils.js";
import { describe, it, beforeAll, beforeEach, afterEach, expect } from "vitest";

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
            expect(cookies).toBeInstanceOf(Array);
            expect(cookies.length).toBeGreaterThan(0);
            expect(cookies.some((cookie) => cookie.includes("session_token"))).toBe(true);
        });

        it("should reject login with wrong password", async () => {
            const response = await server.post("/api/auth", {
                password: "wrong-password",
            });

            expect(response.status).toBe(400);
            expect(response.body.message).toEqual(expect.stringContaining("Invalid password"));
        });

        it("should reject login with missing password", async () => {
            const response = await server.post("/api/auth", {});

            expect(response.status).toBe(400);
            expect(response.body.message).toEqual(expect.stringContaining("Password is required"));
        });
    });

    describe("GET /api/auth/me", () => {
        describe("when authenticated", () => {
            beforeEach(async () => {
                await server.login();
            });

            it("should return complete user context with all data", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    message: "User context retrieved successfully",
                    errors: null,
                });

                expect(response.body.data).toBeDefined();
                expect(response.body.data.isAuthenticated).toBe(true);
                expect(response.body.data.isPasswordConfigured).toBe(true);
            });

            it("should return calendars array for authenticated users", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data.calendars).toBeDefined();
                expect(response.body.data.calendars).toBeInstanceOf(Array);
            });

            it("should include cron settings for authenticated users", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data.cronSettings).toBeDefined();
                expect(typeof response.body.data.cronSettings).toBe("object");
                expect(response.body.data.cronSettings).toHaveProperty("enabled");
                expect(typeof response.body.data.cronSettings.enabled).toBe("boolean");
            });

            it("should return consistent data structure", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data).toEqual(
                    expect.objectContaining({
                        isAuthenticated: expect.any(Boolean),
                        isPasswordConfigured: expect.any(Boolean),
                        calendars: expect.any(Array),
                        cronSettings: expect.any(Object),
                    }),
                );
            });
        });

        describe("when not authenticated", () => {
            beforeEach(async () => {
                await server.logout();
            });

            afterEach(async () => {
                await server.login();
            });

            it("should return user context without sensitive data", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    message: "User context retrieved successfully",
                    errors: null,
                });

                expect(response.body.data.isAuthenticated).toBe(false);
                expect(response.body.data.isPasswordConfigured).toBe(true);
            });

            it("should return public calendars only for unauthenticated users", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data.calendars).toBeDefined();
                expect(response.body.data.calendars).toBeInstanceOf(Array);
            });

            it("should not include cron settings for unauthenticated users", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data.cronSettings).toBeUndefined();
                expect(response.body.data).not.toHaveProperty("cronSettings");
            });

            it("should return safe data structure for unauthenticated users", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data).toEqual(
                    expect.objectContaining({
                        isAuthenticated: false,
                        isPasswordConfigured: expect.any(Boolean),
                        calendars: expect.any(Array),
                    }),
                );

                expect(Object.keys(response.body.data)).not.toContain("cronSettings");
            });
        });

        describe("password configuration states", () => {
            it("should return false for isPasswordConfigured when no password is set", async () => {
                const { createTestServer } = await import("../../utils/test-utils.js");
                const freshServer = await createTestServer();
                await freshServer.ctx.models.settings.set("app_password", null);

                const response = await freshServer.get("/api/auth/me");

                expect(response.status).toBe(200);
                expect(response.body.data.isPasswordConfigured).toBe(false);
                expect(response.body.data.isAuthenticated).toBe(false);
            });

            it("should return true for isPasswordConfigured when password exists", async () => {
                const response = await server.get("/api/auth/me");

                expect(response.body.data.isPasswordConfigured).toBe(true);
            });
        });

        describe("authentication state transitions", () => {
            it("should reflect authentication state changes correctly", async () => {
                await server.login();
                const authResponse = await server.get("/api/auth/me");
                expect(authResponse.body.data.isAuthenticated).toBe(true);
                expect(authResponse.body.data.cronSettings).toMatchObject({
                    enabled: expect.any(Boolean),
                });

                await server.logout();
                const unauthResponse = await server.get("/api/auth/me");
                expect(unauthResponse.body.data.isAuthenticated).toBe(false);
                expect(unauthResponse.body.data.cronSettings).toBeUndefined();

                await server.login();
                const reAuthResponse = await server.get("/api/auth/me");
                expect(reAuthResponse.body.data.isAuthenticated).toBe(true);
                expect(reAuthResponse.body.data.cronSettings).toMatchObject({
                    enabled: expect.any(Boolean),
                });
            });
        });

        describe("error handling", () => {
            it("should handle invalid session tokens gracefully", async () => {
                await server.logout();

                const response = await server
                    .request("get", "/api/auth/me")
                    .set("Cookie", "session_token=invalid-token-12345");

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.isAuthenticated).toBe(false);
            });

            it("should handle expired session tokens gracefully", async () => {
                await server.logout();

                const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000;
                const expiredToken = `${expiredTimestamp}.expired123`;

                const response = await server
                    .request("get", "/api/auth/me")
                    .set("Cookie", `session_token=${expiredToken}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.isAuthenticated).toBe(false);
            });

            it("should handle malformed session tokens gracefully", async () => {
                await server.logout();

                const response = await server
                    .request("get", "/api/auth/me")
                    .set("Cookie", "session_token=malformed");

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.isAuthenticated).toBe(false);
            });
        });

        describe("data consistency", () => {
            it("should return consistent calendar access based on authentication", async () => {
                await server.login();
                const authResponse = await server.get("/api/auth/me");
                const authCalendars = authResponse.body.data.calendars;

                await server.logout();
                const unauthResponse = await server.get("/api/auth/me");
                const publicCalendars = unauthResponse.body.data.calendars;

                expect(publicCalendars.length).toBeLessThanOrEqual(authCalendars.length);

                publicCalendars.forEach((calendar) => {
                    expect(calendar.visible_to_public).toBe(1); // Database stores as 1 for true
                });

                await server.login();
            });

            it("should maintain consistent response structure across calls", async () => {
                const response1 = await server.get("/api/auth/me");
                const response2 = await server.get("/api/auth/me");

                expect(response1.body.data).toEqual(response2.body.data);
                expect(Object.keys(response1.body.data).sort()).toEqual(
                    Object.keys(response2.body.data).sort(),
                );
            });
        });
    });

    describe("POST /api/auth/logout", () => {
        it("should logout successfully", async () => {
            const response = await server.post("/api/auth/logout");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Logged out successfully");

            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeInstanceOf(Array);
            expect(cookies.length).toBeGreaterThan(0);
            expect(cookies.some((cookie) => cookie.includes("session_token=;"))).toBe(true);
        });
    });

    describe("Full Auth Flow", () => {
        it("should complete login -> me -> logout flow", async () => {
            const sessionToken = await server.login();
            expect(sessionToken).toMatch(/^\d+\.[a-z0-9]+$/); // timestamp.random format

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
            expect(response.body.errors.password).toBe(
                "Application password is already configured",
            );
        });

        it("should reject missing password", async () => {
            await testServer.ctx.models.settings.set("app_password", null);

            const passwordData = {
                confirmPassword: "test-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.password).toBe("Password is required");
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                password: "test-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.confirmPassword).toBe("Password confirmation is required");
        });

        it("should reject mismatched passwords", async () => {
            const passwordData = {
                password: "test-password",
                confirmPassword: "different-password",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.confirmPassword).toBe("Passwords do not match");
        });

        it("should reject short password", async () => {
            const passwordData = {
                password: "short",
                confirmPassword: "short",
            };

            const response = await testServer.post("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.password).toBe(
                "Password must be at least 8 characters long",
            );
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
            expect(response.body.errors.currentPassword).toBe("Current password is incorrect");
        });

        it("should reject missing current password", async () => {
            const passwordData = {
                newPassword: "new-password-123",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.currentPassword).toBe("Current password is required");
        });

        it("should reject missing new password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                confirmPassword: "new-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.newPassword).toBe("New password is required");
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.confirmPassword).toBe("Password confirmation is required");
        });

        it("should reject mismatched new passwords", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "new-password-123",
                confirmPassword: "different-password",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.confirmPassword).toBe("Passwords do not match");
        });

        it("should reject short new password", async () => {
            const passwordData = {
                currentPassword: "test-password",
                newPassword: "short",
                confirmPassword: "short",
            };

            const response = await authServer.put("/api/auth/password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.errors.newPassword).toBe(
                "New password must be at least 8 characters long",
            );
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
