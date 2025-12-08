import { describe, it, expect, beforeEach } from "vitest";
import { setupAuthenticatedTestServer } from "../../utils/test-utils.js";

describe("Feed Router", () => {
    const server = setupAuthenticatedTestServer();

    beforeEach(async () => {
        await server.cleanDatabase();
        // Also clean feed settings between tests
        await server.ctx.db("settings").where("key", "like", "feed_%").del();
    });

    describe("GET /api/feed/:token.ics", () => {
        it("should return iCal feed with valid token", async () => {
            // Create a calendar with iCal data
            await server.ctx.models.calendar.create({
                name: "Test Calendar",
                url: "https://example.com/calendar.ics",
                color: "#447dfc",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test@example.com
DTSTART:20250101T100000Z
DTEND:20250101T110000Z
SUMMARY:Test Event 1
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            // Get the feed token
            const tokenResponse = await server.get("/api/settings/feed-token");
            const token = tokenResponse.body.data.token;

            // Access the feed
            const response = await server.get(`/api/feed/${token}.ics`);

            expect(response.status).toBe(200);
            expect(response.headers["content-type"]).toContain("text/calendar");
            expect(response.headers["content-disposition"]).toContain("calendar.ics");
            expect(response.text).toContain("BEGIN:VCALENDAR");
            expect(response.text).toContain("END:VCALENDAR");
            expect(response.text).toContain("BEGIN:VEVENT");
            expect(response.text).toContain("Test Event 1");
        });

        it("should return 404 for invalid token", async () => {
            const response = await server.get("/api/feed/invalid-token.ics");

            expect(response.status).toBe(404);
        });

        it("should combine multiple calendars into one feed", async () => {
            await server.ctx.models.calendar.create({
                name: "Calendar 1",
                url: "https://example.com/cal1.ics",
                color: "#ff0000",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250101T100000Z
SUMMARY:Event from Calendar 1
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            await server.ctx.models.calendar.create({
                name: "Calendar 2",
                url: "https://example.com/cal2.ics",
                color: "#00ff00",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event2@example.com
DTSTART:20250102T100000Z
SUMMARY:Event from Calendar 2
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            const tokenResponse = await server.get("/api/settings/feed-token");
            const token = tokenResponse.body.data.token;

            const response = await server.get(`/api/feed/${token}.ics`);

            expect(response.status).toBe(200);
            expect(response.text).toContain("Event from Calendar 1");
            expect(response.text).toContain("Event from Calendar 2");
            // Should only have one VCALENDAR wrapper
            expect((response.text.match(/BEGIN:VCALENDAR/g) || []).length).toBe(1);
            expect((response.text.match(/END:VCALENDAR/g) || []).length).toBe(1);
        });

        it("should only include selected calendars when specified", async () => {
            const cal1 = await server.ctx.models.calendar.create({
                name: "Calendar 1",
                url: "https://example.com/cal1.ics",
                color: "#ff0000",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250101T100000Z
SUMMARY:Selected Event
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            await server.ctx.models.calendar.create({
                name: "Calendar 2",
                url: "https://example.com/cal2.ics",
                color: "#00ff00",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event2@example.com
DTSTART:20250102T100000Z
SUMMARY:Excluded Event
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            // Set feed to only include calendar 1
            await server.put("/api/settings/feed-token/calendars", {
                calendars: [cal1.id],
            });

            const tokenResponse = await server.get("/api/settings/feed-token");
            const token = tokenResponse.body.data.token;

            const response = await server.get(`/api/feed/${token}.ics`);

            expect(response.status).toBe(200);
            expect(response.text).toContain("Selected Event");
            expect(response.text).not.toContain("Excluded Event");
        });

        it("should include all calendars when no selection is made", async () => {
            await server.ctx.models.calendar.create({
                name: "Calendar 1",
                url: "https://example.com/cal1.ics",
                color: "#ff0000",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250101T100000Z
SUMMARY:Event One
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            await server.ctx.models.calendar.create({
                name: "Calendar 2",
                url: "https://example.com/cal2.ics",
                color: "#00ff00",
                ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event2@example.com
DTSTART:20250102T100000Z
SUMMARY:Event Two
END:VEVENT
END:VCALENDAR`,
                visible_to_public: true,
                show_details_to_public: true,
            });

            // Explicitly set to empty array (all calendars)
            await server.put("/api/settings/feed-token/calendars", {
                calendars: [],
            });

            const tokenResponse = await server.get("/api/settings/feed-token");
            const token = tokenResponse.body.data.token;

            const response = await server.get(`/api/feed/${token}.ics`);

            expect(response.status).toBe(200);
            expect(response.text).toContain("Event One");
            expect(response.text).toContain("Event Two");
        });

        it("should return empty feed when no calendars exist", async () => {
            const tokenResponse = await server.get("/api/settings/feed-token");
            const token = tokenResponse.body.data.token;

            const response = await server.get(`/api/feed/${token}.ics`);

            expect(response.status).toBe(200);
            expect(response.text).toContain("BEGIN:VCALENDAR");
            expect(response.text).toContain("END:VCALENDAR");
            expect(response.text).not.toContain("BEGIN:VEVENT");
        });

        it("should handle calendars without iCal data", async () => {
            await server.ctx.models.calendar.create({
                name: "Empty Calendar",
                url: "https://example.com/empty.ics",
                color: "#ff0000",
                ical_data: null,
                visible_to_public: true,
                show_details_to_public: true,
            });

            const tokenResponse = await server.get("/api/settings/feed-token");
            const token = tokenResponse.body.data.token;

            const response = await server.get(`/api/feed/${token}.ics`);

            expect(response.status).toBe(200);
            expect(response.text).toContain("BEGIN:VCALENDAR");
            expect(response.text).toContain("END:VCALENDAR");
        });
    });
});
