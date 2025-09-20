import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { setupAuthenticatedServer } from "../../utils/test-utils.js";

describe("Calendar", () => {
    let testServer;

    beforeAll(async () => {
        testServer = await setupAuthenticatedServer();
        await testServer.cleanDatabase();
    });

    afterAll(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    describe("GET /api/calendars", () => {
        it("should get calendars list regardless of auth status", async () => {
            let response = await testServer.get("/api/calendars");
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();

            await testServer.logout();
            response = await testServer.get("/api/calendars");
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();

            await testServer.login();
        });
    });

    describe("POST /api/calendars", () => {
        it("should create a new calendar", async () => {
            const calendarData = {
                name: "Test Calendar",
                url: "https://calendar.google.com/calendar/ical/test@gmail.com/public/basic.ics",
                color: "#ff0000",
            };

            const response = await testServer.post("/api/calendars", calendarData);

            expect(response.status).toBe(201);
            expect(response.body.name).toBe("Test Calendar");
            expect(response.body.url).toBe(calendarData.url);
            expect(response.body.color).toBe("#ff0000");
            expect(response.body.id).toBeTruthy();
        });

        it("should reject calendar with missing name", async () => {
            const calendarData = {
                url: "https://calendar.google.com/calendar/ical/test2@gmail.com/public/basic.ics",
            };

            const response = await testServer.post("/api/calendars", calendarData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
        });

        it("should reject calendar with invalid URL", async () => {
            const calendarData = {
                name: "Invalid URL Calendar",
                url: "not-a-valid-url",
            };

            const response = await testServer.post("/api/calendars", calendarData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
        });

        it("should reject duplicate calendar URL", async () => {
            const calendarData = {
                name: "Duplicate Calendar",
                url: "https://calendar.google.com/calendar/ical/test@gmail.com/public/basic.ics",
            };

            const response = await testServer.post("/api/calendars", calendarData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeTruthy();
            expect(response.body.error.includes("already exists")).toBeTruthy();
        });

        it("should require authentication", async () => {
            await testServer.logout();

            const calendarData = {
                name: "Unauthorized Calendar",
                url: "https://calendar.google.com/calendar/ical/unauthorized@gmail.com/public/basic.ics",
            };

            const response = await testServer.post("/api/calendars", calendarData);

            expect(response.status).toBe(401);

            await testServer.login();
        });
    });

    describe("GET /api/calendars/:id", () => {
        let calendarId;

        beforeAll(async () => {
            const calendar = await testServer.ctx.models.calendar.create({
                name: "Get Test Calendar",
                url: "https://calendar.google.com/calendar/ical/get-test@gmail.com/public/basic.ics",
            });
            calendarId = calendar.id;
        });

        it("should get calendar by ID", async () => {
            const response = await testServer.get(`/api/calendars/${calendarId}`);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.id).toBe(calendarId);
            expect(data.data.name).toBe("Get Test Calendar");
        });

        it("should return 404 for non-existent calendar", async () => {
            const response = await testServer.get("/api/calendars/99999");

            expect(response.status).toBe(404);
        });

        it("should require authentication", async () => {
            await testServer.logout();

            const response = await testServer.get(`/api/calendars/${calendarId}`);

            expect(response.status).toBe(401);

            await testServer.login();
        });
    });

    describe("PUT /api/calendars/:id", () => {
        let calendarId;

        beforeAll(async () => {
            const calendar = await testServer.ctx.models.calendar.create({
                name: "Update Test Calendar",
                url: "https://calendar.google.com/calendar/ical/update-test@gmail.com/public/basic.ics",
            });
            calendarId = calendar.id;
        });

        it("should update calendar name", async () => {
            const updateData = {
                name: "Updated Calendar Name",
            };

            const response = await testServer.put(`/api/calendars/${calendarId}`, updateData);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.name).toBe("Updated Calendar Name");
            expect(data.id).toBe(calendarId);
        });

        it("should update calendar visibility", async () => {
            const updateData = {
                visible: false,
            };

            const response = await testServer.put(`/api/calendars/${calendarId}`, updateData);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(!!data.hidden).toBe(true);
        });

        it("should return 404 for non-existent calendar", async () => {
            const updateData = {
                name: "Non-existent Calendar",
            };

            const response = await testServer.put("/api/calendars/99999", updateData);

            expect(response.status).toBe(404);
        });

        it("should require authentication", async () => {
            await testServer.logout();

            const updateData = {
                name: "Unauthorized Update",
            };

            const response = await testServer.put(`/api/calendars/${calendarId}`, updateData);

            expect(response.status).toBe(401);

            await testServer.login();
        });
    });

    describe("DELETE /api/calendars/:id", () => {
        let calendarId;

        beforeAll(async () => {
            const calendar = await testServer.ctx.models.calendar.create({
                name: "Delete Test Calendar",
                url: "https://calendar.google.com/calendar/ical/delete-test@gmail.com/public/basic.ics",
            });
            calendarId = calendar.id;
        });

        it("should delete calendar by ID", async () => {
            const response = await testServer.delete(`/api/calendars/${calendarId}`);
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.name).toBe("Delete Test Calendar");
            expect(data.id).toBe(calendarId);

            const getResponse = await testServer.get(`/api/calendars/${calendarId}`);
            expect(getResponse.status).toBe(404);
        });

        it("should return 404 for non-existent calendar", async () => {
            const response = await testServer.delete("/api/calendars/99999");

            expect(response.status).toBe(404);
        });

        it("should require authentication", async () => {
            await testServer.logout();

            const response = await testServer.delete("/api/calendars/1");

            expect(response.status).toBe(401);

            await testServer.login();
        });
    });

    describe("POST /api/calendars/refresh", () => {
        it("should initiate calendar refresh", async () => {
            const response = await testServer.post("/api/calendars/refresh");
            const data = response.body;

            expect(response.status).toBe(200);
            expect(data.successful).toBeDefined();
            expect(data.total).toBeDefined();
        });

        it("should require authentication", async () => {
            await testServer.logout();

            const response = await testServer.post("/api/calendars/refresh");

            expect(response.status).toBe(401);

            await testServer.login();
        });
    });
});
