import { describe, it, expect } from "vitest";
import { setupTestServer, setupAuthenticatedTestServer } from "../../utils/test-utils.js";

describe("Settings", () => {
    const server = setupTestServer();
    const authServer = setupAuthenticatedTestServer();

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

    describe("PUT /api/settings/theme", () => {
        it("should update theme with valid value", async () => {
            const response = await authServer.put("/api/settings/theme", { theme: "dark" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Theme updated successfully");
            expect(response.body.data.theme).toBe("dark");
        });

        it("should accept light theme", async () => {
            const response = await authServer.put("/api/settings/theme", { theme: "light" });

            expect(response.status).toBe(200);
            expect(response.body.data.theme).toBe("light");
        });

        it("should accept system theme", async () => {
            const response = await authServer.put("/api/settings/theme", { theme: "system" });

            expect(response.status).toBe(200);
            expect(response.body.data.theme).toBe("system");
        });

        it("should reject invalid theme value", async () => {
            const response = await authServer.put("/api/settings/theme", { theme: "invalid" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors.theme).toBeTruthy();
        });

        it("should reject missing theme", async () => {
            const response = await authServer.put("/api/settings/theme", {});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should require authentication", async () => {
            const response = await server.put("/api/settings/theme", { theme: "dark" });

            expect(response.status).toBe(401);
        });
    });
});
