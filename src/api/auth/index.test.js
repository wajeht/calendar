import { setupTestServer } from "../../utils/test-utils.js";
import { describe, it, beforeAll, expect } from "vitest";

describe("Auth", () => {
    const server = setupTestServer();

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
});
