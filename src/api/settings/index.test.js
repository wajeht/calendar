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

    describe("GET /api/settings/feed-token", () => {
        it("should get feed token when authenticated", async () => {
            const response = await authServer.get("/api/settings/feed-token");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Feed token retrieved successfully");
            expect(response.body.errors).toBe(null);
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.token).toHaveLength(64); // 32 bytes = 64 hex chars
            expect(response.body.data.feedUrl).toContain("/api/feed/");
            expect(response.body.data.feedUrl).toContain(".ics");
            expect(response.body.data.calendars).toBeDefined();
            expect(Array.isArray(response.body.data.calendars)).toBe(true);
        });

        it("should return same token on subsequent calls", async () => {
            const response1 = await authServer.get("/api/settings/feed-token");
            const response2 = await authServer.get("/api/settings/feed-token");

            expect(response1.body.data.token).toBe(response2.body.data.token);
        });

        it("should require authentication", async () => {
            const response = await server.get("/api/settings/feed-token");

            expect(response.status).toBe(401);
        });
    });

    describe("POST /api/settings/feed-token/regenerate", () => {
        it("should regenerate feed token", async () => {
            const originalResponse = await authServer.get("/api/settings/feed-token");
            const originalToken = originalResponse.body.data.token;

            const response = await authServer.post("/api/settings/feed-token/regenerate");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Feed token regenerated successfully");
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.token).not.toBe(originalToken);
            expect(response.body.data.token).toHaveLength(64);
            expect(response.body.data.feedUrl).toContain(response.body.data.token);
        });

        it("should require authentication", async () => {
            const response = await server.post("/api/settings/feed-token/regenerate");

            expect(response.status).toBe(401);
        });
    });

    describe("PUT /api/settings/feed-token/calendars", () => {
        it("should update feed calendars with valid array", async () => {
            const response = await authServer.put("/api/settings/feed-token/calendars", {
                calendars: [1, 2, 3],
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Feed calendars updated successfully");
            expect(response.body.data.calendars).toEqual([1, 2, 3]);
        });

        it("should accept empty array to include all calendars", async () => {
            const response = await authServer.put("/api/settings/feed-token/calendars", {
                calendars: [],
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.calendars).toEqual([]);
        });

        it("should persist selected calendars", async () => {
            await authServer.put("/api/settings/feed-token/calendars", {
                calendars: [5, 10],
            });

            const response = await authServer.get("/api/settings/feed-token");

            expect(response.body.data.calendars).toEqual([5, 10]);
        });

        it("should reject non-array calendars", async () => {
            const response = await authServer.put("/api/settings/feed-token/calendars", {
                calendars: "not-an-array",
            });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors.calendars).toBeTruthy();
        });

        it("should reject missing calendars field", async () => {
            const response = await authServer.put("/api/settings/feed-token/calendars", {});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should require authentication", async () => {
            const response = await server.put("/api/settings/feed-token/calendars", {
                calendars: [1, 2],
            });

            expect(response.status).toBe(401);
        });
    });
});
