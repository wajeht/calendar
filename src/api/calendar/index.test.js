import { describe, it, beforeAll, expect } from "vitest";
import { setupAuthenticatedTestServer } from "../../utils/test-utils.js";

describe("Calendar", () => {
    const server = setupAuthenticatedTestServer();

    describe("GET /api/calendars", () => {
        it("should get calendars list regardless of auth status", async () => {
            let response = await server.get("/api/calendars");
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.errors).toBe(null);
            expect(Array.isArray(response.body.data)).toBe(true);

            await server.logout();
            response = await server.get("/api/calendars");
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.errors).toBe(null);
            expect(Array.isArray(response.body.data)).toBe(true);

            await server.login();
        });
    });

    describe("POST /api/calendars", () => {
        it("should create a new calendar", async () => {
            const calendarData = {
                name: "Test Calendar",
                url: "https://calendar.google.com/calendar/ical/test@gmail.com/public/basic.ics",
                color: "#ff0000",
            };

            const response = await server.post("/api/calendars", calendarData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.errors).toBe(null);
            expect(response.body.data.name).toBe("Test Calendar");
            expect(response.body.data.url).toBe(calendarData.url);
            expect(response.body.data.color).toBe("#ff0000");
            expect(typeof response.body.data.id).toBe("number");
            expect(response.body.data.id).toBeGreaterThan(0);
        });

        it("should reject calendar with missing name", async () => {
            const calendarData = {
                url: "https://calendar.google.com/calendar/ical/test2@gmail.com/public/basic.ics",
            };

            const response = await server.post("/api/calendars", calendarData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject calendar with invalid URL", async () => {
            const calendarData = {
                name: "Invalid URL Calendar",
                url: "not-a-valid-url",
            };

            const response = await server.post("/api/calendars", calendarData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
        });

        it("should reject duplicate calendar URL", async () => {
            const calendarData = {
                name: "Duplicate Calendar",
                url: "https://calendar.google.com/calendar/ical/test@gmail.com/public/basic.ics",
            };

            const response = await server.post("/api/calendars", calendarData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBeTruthy();
            expect(response.body.message.includes("already exists")).toBeTruthy();
        });

        it("should require authentication", async () => {
            await server.logout();

            const calendarData = {
                name: "Unauthorized Calendar",
                url: "https://calendar.google.com/calendar/ical/unauthorized@gmail.com/public/basic.ics",
            };

            const response = await server.post("/api/calendars", calendarData);

            expect(response.status).toBe(401);

            await server.login();
        });
    });

    describe("GET /api/calendars/:id", () => {
        let calendarId;

        beforeAll(async () => {
            const calendar = await server.ctx.models.calendar.create({
                name: "Get Test Calendar",
                url: "https://calendar.google.com/calendar/ical/get-test@gmail.com/public/basic.ics",
            });
            calendarId = calendar.id;
        });

        it("should get calendar by ID", async () => {
            const response = await server.get(`/api/calendars/${calendarId}`);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.id).toBe(calendarId);
            expect(data.data.name).toBe("Get Test Calendar");
        });

        it("should return 404 for non-existent calendar", async () => {
            const response = await server.get("/api/calendars/99999");

            expect(response.status).toBe(404);
        });

        it("should require authentication", async () => {
            await server.logout();

            const response = await server.get(`/api/calendars/${calendarId}`);

            expect(response.status).toBe(401);

            await server.login();
        });
    });

    describe("PUT /api/calendars/:id", () => {
        let calendarId;

        beforeAll(async () => {
            const calendar = await server.ctx.models.calendar.create({
                name: "Update Test Calendar",
                url: "https://calendar.google.com/calendar/ical/update-test@gmail.com/public/basic.ics",
            });
            calendarId = calendar.id;
        });

        it("should update calendar name", async () => {
            const updateData = {
                name: "Updated Calendar Name",
            };

            const response = await server.put(`/api/calendars/${calendarId}`, updateData);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.data.name).toBe("Updated Calendar Name");
            expect(data.data.id).toBe(calendarId);
        });

        it("should update calendar visibility", async () => {
            const updateData = {
                visible_to_public: false,
            };

            const response = await server.put(`/api/calendars/${calendarId}`, updateData);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(!!data.data.visible_to_public).toBe(false);
        });

        it("should return 404 for non-existent calendar", async () => {
            const updateData = {
                name: "Non-existent Calendar",
            };

            const response = await server.put("/api/calendars/99999", updateData);

            expect(response.status).toBe(404);
        });

        it("should require authentication", async () => {
            await server.logout();

            const updateData = {
                name: "Unauthorized Update",
            };

            const response = await server.put(`/api/calendars/${calendarId}`, updateData);

            expect(response.status).toBe(401);

            await server.login();
        });
    });

    describe("DELETE /api/calendars/:id", () => {
        let calendarId;

        beforeAll(async () => {
            const calendar = await server.ctx.models.calendar.create({
                name: "Delete Test Calendar",
                url: "https://calendar.google.com/calendar/ical/delete-test@gmail.com/public/basic.ics",
            });
            calendarId = calendar.id;
        });

        it("should delete calendar by ID", async () => {
            const response = await server.delete(`/api/calendars/${calendarId}`);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe("Calendar deleted successfully");

            const getResponse = await server.get(`/api/calendars/${calendarId}`);
            expect(getResponse.status).toBe(404);
        });

        it("should return 404 for non-existent calendar", async () => {
            const response = await server.delete("/api/calendars/99999");

            expect(response.status).toBe(404);
        });

        it("should require authentication", async () => {
            await server.logout();

            const response = await server.delete("/api/calendars/1");

            expect(response.status).toBe(401);

            await server.login();
        });
    });

    describe("POST /api/calendars/refresh", () => {
        it("should initiate calendar refresh", async () => {
            const response = await server.post("/api/calendars/refresh");
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.data.successful).toBeDefined();
            expect(data.data.total).toBeDefined();
        });

        it("should require authentication", async () => {
            await server.logout();

            const response = await server.post("/api/calendars/refresh");

            expect(response.status).toBe(401);

            await server.login();
        });
    });

    describe("GET /api/calendars/export", () => {
        it("should export calendars successfully", async () => {
            const response = await server.get("/api/calendars/export");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Calendars exported successfully");
            expect(response.body.errors).toBe(null);
            expect(Array.isArray(response.body.data.calendars)).toBe(true);
            expect(response.body.data.calendars.length).toBeGreaterThanOrEqual(0);
            expect(response.body.data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(response.body.data.version).toBe("1.0");
        });

        it("should require authentication", async () => {
            await server.logout();

            const response = await server.get("/api/calendars/export");

            expect(response.status).toBe(401);

            await server.login();
        });
    });

    describe("POST /api/calendars/import", () => {
        it("should import calendars successfully", async () => {
            const importData = {
                calendars: [
                    {
                        name: "Imported Calendar",
                        url: "https://calendar.google.com/calendar/ical/imported@gmail.com/public/basic.ics",
                        color: "#00ff00",
                    },
                ],
            };

            const response = await server.post("/api/calendars/import", importData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Calendars imported successfully");
            expect(response.body.errors).toBe(null);
            expect(response.body.data.imported).toBe(1);
            expect(response.body.data.skipped).toBe(0);
            expect(Array.isArray(response.body.data.errors)).toBe(true);
            expect(response.body.data.errors.length).toBe(0);
        });

        it("should accept empty calendars array", async () => {
            const importData = {
                calendars: [],
            };

            const response = await server.post("/api/calendars/import", importData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Calendars imported successfully");
            expect(response.body.errors).toBe(null);
            expect(response.body.data.imported).toBe(0);
            expect(response.body.data.skipped).toBe(0);
            expect(Array.isArray(response.body.data.errors)).toBe(true);
            expect(response.body.data.errors.length).toBe(0);
        });

        it("should reject missing calendars field", async () => {
            const importData = {};

            const response = await server.post("/api/calendars/import", importData);

            expect(response.status).toBe(500);
        });

        it("should require authentication", async () => {
            await server.logout();

            const importData = {
                calendars: [
                    {
                        name: "Unauthorized Import",
                        url: "https://calendar.google.com/calendar/ical/unauthorized@gmail.com/public/basic.ics",
                    },
                ],
            };

            const response = await server.post("/api/calendars/import", importData);

            expect(response.status).toBe(401);

            await server.login();
        });
    });
});
