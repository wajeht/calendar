import { createTestServer } from "../../../utils/test-utils.js";
import { describe, it, beforeAll, afterAll, expect } from "vitest";

describe("Auth", () => {
    let testServer;

    beforeAll(async () => {
        testServer = await createTestServer();
    });

    afterAll(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    describe("POST /api/auth", () => {
        it("should login successfully with correct password", async () => {
            const response = await testServer.post("/api/auth", {
                password: process.env.APP_PASSWORD || "password",
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Authentication successful");

            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeTruthy();
            expect(cookies.some((cookie) => cookie.includes("session_token"))).toBe(true);
        });

        it("should reject login with wrong password", async () => {
            const response = await testServer.post("/api/auth", {
                password: "wrong-password",
            });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
            expect(response.body.error.includes("Invalid password")).toBe(true);
        });

        it("should reject login with missing password", async () => {
            const response = await testServer.post("/api/auth", {});

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
            expect(response.body.error.includes("Password is required")).toBe(true);
        });
    });

    describe("GET /api/auth/verify", () => {
        beforeAll(async () => {
            await testServer.login();
        });

        it("should verify valid session token", async () => {
            const response = await testServer.get("/api/auth/verify");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Session is valid");
        });

        it("should reject invalid session token", async () => {
            await testServer.logout();

            const response = await testServer
                .request("get", "/api/auth/verify")
                .set("Cookie", "session_token=invalid-token");

            expect(response.status).toBe(401);
            await testServer.login();
        });

        it("should reject missing session token", async () => {
            await testServer.logout();

            const response = await testServer.get("/api/auth/verify");
            expect(response.status).toBe(401);

            await testServer.login();
        });
    });

    describe("POST /api/auth/logout", () => {
        it("should logout successfully", async () => {
            const response = await testServer.post("/api/auth/logout");

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
            const sessionToken = await testServer.login();
            expect(sessionToken).toBeTruthy();

            const verifyResponse = await testServer.get("/api/auth/verify");
            expect(verifyResponse.status).toBe(200);

            await testServer.logout();

            const invalidVerifyResponse = await testServer.get("/api/auth/verify");
            expect(invalidVerifyResponse.status).toBe(401);
        });
    });
});
