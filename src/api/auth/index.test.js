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

    describe("GET /api/auth/verify", () => {
        beforeAll(async () => {
            await server.login();
        });

        it("should verify valid session token", async () => {
            const response = await server.get("/api/auth/verify");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Session is valid");
        });

        it("should reject invalid session token", async () => {
            await server.logout();

            const response = await server
                .request("get", "/api/auth/verify")
                .set("Cookie", "session_token=invalid-token");

            expect(response.status).toBe(401);
            await server.login();
        });

        it("should reject missing session token", async () => {
            await server.logout();

            const response = await server.get("/api/auth/verify");
            expect(response.status).toBe(401);

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
        it("should complete login -> verify -> logout flow", async () => {
            const sessionToken = await server.login();
            expect(sessionToken).toBeTruthy();

            const verifyResponse = await server.get("/api/auth/verify");
            expect(verifyResponse.status).toBe(200);

            await server.logout();

            const invalidVerifyResponse = await server.get("/api/auth/verify");
            expect(invalidVerifyResponse.status).toBe(401);
        });
    });

    describe("GET /api/auth/password-configured", () => {
        it("should check password configuration status", async () => {
            const response = await server.get("/api/auth/password-configured");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Password configuration status retrieved successfully",
            );
            expect(response.body.errors).toBe(null);
            expect(typeof response.body.data.configured).toBe("boolean");
        });

        it("should not require authentication", async () => {
            const response = await server.get("/api/auth/password-configured");

            expect(response.status).toBe(200);
        });
    });

    describe("POST /api/auth/setup-password", () => {
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

            const response = await testServer.post("/api/auth/setup-password", passwordData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Password configured successfully");
        });

        it("should reject setup when password already configured", async () => {
            const passwordData = {
                password: "another-password",
                confirmPassword: "another-password",
            };

            const response = await testServer.post("/api/auth/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing password", async () => {
            await testServer.ctx.models.settings.set("app_password", null);

            const passwordData = {
                confirmPassword: "test-password",
            };

            const response = await testServer.post("/api/auth/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject missing confirm password", async () => {
            const passwordData = {
                password: "test-password",
            };

            const response = await testServer.post("/api/auth/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject mismatched passwords", async () => {
            const passwordData = {
                password: "test-password",
                confirmPassword: "different-password",
            };

            const response = await testServer.post("/api/auth/setup-password", passwordData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject short password", async () => {
            const passwordData = {
                password: "short",
                confirmPassword: "short",
            };

            const response = await testServer.post("/api/auth/setup-password", passwordData);

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
