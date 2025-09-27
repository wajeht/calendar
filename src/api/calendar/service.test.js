import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from "vitest";
import { createTestServer } from "../../utils/test-utils.js";
import { createCalendarService } from "./service.js";

const sampleICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1@example.com
DTSTART:20250101T100000Z
DTEND:20250101T110000Z
SUMMARY:Test Event 1
DESCRIPTION:This is a test event
LOCATION:Test Location
ORGANIZER;CN=Test Organizer:mailto:organizer@example.com
ATTENDEE;CN=Test Attendee:mailto:attendee@example.com
CREATED:20241201T120000Z
LAST-MODIFIED:20241201T120000Z
DTSTAMP:20241201T120000Z
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:0
URL:https://example.com/event
END:VEVENT
BEGIN:VEVENT
UID:recurring-event@example.com
DTSTART:20250101T140000Z
DTEND:20250101T150000Z
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Recurring Event
DESCRIPTION:Weekly recurring event
END:VEVENT
END:VCALENDAR`;

const sampleCalendar = {
    id: 1,
    name: "Test Calendar",
    url: "https://example.com/calendar.ics",
    color: "#447dfc",
    visible_to_public: true,
    show_details_to_public: true,
};

describe("Calendar Service", () => {
    let testServer;
    let calendarService;

    beforeAll(async () => {
        testServer = await createTestServer();
        await testServer.cleanDatabase();

        calendarService = createCalendarService({
            ICAL: testServer.ctx.ICAL || (await import("ical.js")).default,
            logger: testServer.ctx.logger,
            models: testServer.ctx.models,
            errors: testServer.ctx.errors,
            utils: testServer.ctx.utils,
        });
    });

    afterAll(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    beforeEach(async () => {
        await testServer.cleanDatabase();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Dependency Validation", () => {
        it("should throw ConfigurationError when ICAL is missing", () => {
            expect(() => {
                createCalendarService({
                    logger: testServer.ctx.logger,
                    models: testServer.ctx.models,
                    errors: testServer.ctx.errors,
                    utils: testServer.ctx.utils,
                });
            }).toThrow("ICAL required for calendar service");
        });

        it("should throw ConfigurationError when models is missing", async () => {
            const ICAL = testServer.ctx.ICAL || (await import("ical.js")).default;
            expect(() => {
                createCalendarService({
                    ICAL,
                    logger: testServer.ctx.logger,
                    errors: testServer.ctx.errors,
                    utils: testServer.ctx.utils,
                });
            }).toThrow("Models required for calendar service");
        });

        it("should throw ConfigurationError when logger is missing", async () => {
            const ICAL = testServer.ctx.ICAL || (await import("ical.js")).default;
            expect(() => {
                createCalendarService({
                    ICAL,
                    models: testServer.ctx.models,
                    errors: testServer.ctx.errors,
                    utils: testServer.ctx.utils,
                });
            }).toThrow("Logger required for calendar service");
        });

        it("should throw ConfigurationError when utils is missing", async () => {
            const ICAL = testServer.ctx.ICAL || (await import("ical.js")).default;
            expect(() => {
                createCalendarService({
                    ICAL,
                    logger: testServer.ctx.logger,
                    models: testServer.ctx.models,
                    errors: testServer.ctx.errors,
                });
            }).toThrow("Utils required for calendar service");
        });
    });

    describe("URL Normalization", () => {
        it("should normalize webcal URLs to https", async () => {
            const webcalUrl = "webcal://example.com/calendar.ics";
            const httpsUrl = "https://example.com/calendar.ics";

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: {
                    get: () => "text/calendar",
                },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                name: sampleCalendar.name,
                url: sampleCalendar.url,
                color: sampleCalendar.color,
                visible_to_public: sampleCalendar.visible_to_public,
                show_details_to_public: sampleCalendar.show_details_to_public,
            });

            await calendarService.fetchAndProcessCalendar(calendar.id, webcalUrl);

            expect(global.fetch).toHaveBeenCalledWith(httpsUrl, {
                headers: {
                    "User-Agent": "Calendar-App/1.0",
                    Accept: "text/calendar, application/calendar, text/plain",
                },
                signal: expect.any(AbortSignal),
            });
        });
    });

    describe("fetchAndProcessCalendar", () => {
        it("should successfully fetch and process calendar", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            const result = await calendarService.fetchAndProcessCalendar(
                calendar.id,
                sampleCalendar.url,
            );

            expect(result).toHaveProperty("rawData");
            expect(result).toHaveProperty("events");
            expect(result).toHaveProperty("publicEvents");
            expect(result).toHaveProperty("authenticatedEvents");
            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            expect(updatedCalendar.ical_data).toBe(sampleICalData);
            expect(JSON.parse(updatedCalendar.events_processed)).toHaveLength(4);
        });

        it("should handle fetch timeout", async () => {
            const timeoutError = new Error("AbortError");
            timeoutError.name = "AbortError";

            global.fetch.mockRejectedValue(timeoutError);

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await expect(
                calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url),
            ).rejects.toThrow("Request timeout after 30s");
        });

        it("should handle fetch failure", async () => {
            const fetchError = new Error("Network error");
            global.fetch.mockRejectedValue(fetchError);

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await expect(
                calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url),
            ).rejects.toThrow("Failed to fetch iCal data");
        });

        it("should handle HTTP error responses", async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: "Not Found",
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await expect(
                calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url),
            ).rejects.toThrow("HTTP 404: Not Found");
        });

        it("should handle calendar not found", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const nonExistentId = 99999;

            await expect(
                calendarService.fetchAndProcessCalendar(nonExistentId, sampleCalendar.url),
            ).rejects.toThrow(`Calendar ${nonExistentId}`);
        });

        it("should clear calendar data on error", async () => {
            const fetchError = new Error("Network error");
            global.fetch.mockRejectedValue(fetchError);

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            try {
                await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);
            } catch {}
            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            expect(updatedCalendar.ical_data).toBe(null);
            expect(JSON.parse(updatedCalendar.events_processed)).toEqual([]);
            expect(JSON.parse(updatedCalendar.events_public)).toEqual([]);
            expect(JSON.parse(updatedCalendar.events_private)).toEqual([]);
        });

        it("should process public vs authenticated events correctly", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const publicCalendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: true,
                show_details_to_public: true,
            });

            const result = await calendarService.fetchAndProcessCalendar(
                publicCalendar.id,
                sampleCalendar.url,
            );

            const updatedCalendar = await testServer.ctx.models.calendar.getById(publicCalendar.id);
            const publicEvents = JSON.parse(updatedCalendar.events_public);
            const authenticatedEvents = JSON.parse(updatedCalendar.events_private);

            expect(publicEvents).toHaveLength(4);
            expect(authenticatedEvents).toHaveLength(4);

            expect(publicEvents[0]).toHaveProperty("title", "Test Event 1");
            expect(publicEvents[0].extendedProps).toHaveProperty(
                "description",
                "This is a test event",
            );
            expect(authenticatedEvents[0]).toHaveProperty("title", "Test Event 1");
            expect(authenticatedEvents[0].extendedProps).toHaveProperty(
                "description",
                "This is a test event",
            );
        });

        it("should hide details for public when show_details_to_public is false", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const privateDetailCalendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: true,
                show_details_to_public: false,
            });

            await calendarService.fetchAndProcessCalendar(
                privateDetailCalendar.id,
                sampleCalendar.url,
            );

            const updatedCalendar = await testServer.ctx.models.calendar.getById(
                privateDetailCalendar.id,
            );
            const publicEvents = JSON.parse(updatedCalendar.events_public);
            const authenticatedEvents = JSON.parse(updatedCalendar.events_private);

            expect(publicEvents).toHaveLength(4);
            expect(authenticatedEvents).toHaveLength(4);

            expect(publicEvents[0]).toHaveProperty("title", "");
            expect(publicEvents[0].extendedProps).toHaveProperty("description", "");
            expect(publicEvents[0].extendedProps).toHaveProperty("location", "");

            expect(authenticatedEvents[0]).toHaveProperty("title", "Test Event 1");
            expect(authenticatedEvents[0].extendedProps).toHaveProperty(
                "description",
                "This is a test event",
            );
            expect(authenticatedEvents[0].extendedProps).toHaveProperty(
                "location",
                "Test Location",
            );
        });

        it("should return no public events when visible_to_public is false", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const privateCalendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: false,
                show_details_to_public: true,
            });

            await calendarService.fetchAndProcessCalendar(privateCalendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(
                privateCalendar.id,
            );
            const publicEvents = JSON.parse(updatedCalendar.events_public);
            const authenticatedEvents = JSON.parse(updatedCalendar.events_private);

            expect(publicEvents).toHaveLength(0);
            expect(authenticatedEvents).toHaveLength(4);
        });

        it("should parse recurring events correctly", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            const recurringEvents = events.filter((event) => event.uid.includes("recurring-event"));
            expect(recurringEvents).toHaveLength(3);

            expect(recurringEvents[0]).toHaveProperty("title", "Recurring Event");
            expect(recurringEvents[0]).toHaveProperty("description", "Weekly recurring event");
        });

        it("should handle events with attendees and organizer", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const authenticatedEvents = JSON.parse(updatedCalendar.events_private);

            const eventWithDetails = authenticatedEvents.find(
                (event) => event.title === "Test Event 1",
            );
            expect(eventWithDetails.extendedProps).toHaveProperty(
                "organizerEmail",
                "organizer@example.com",
            );
            expect(eventWithDetails.extendedProps).toHaveProperty("attendeeNames", "Test Attendee");
            expect(eventWithDetails.extendedProps).toHaveProperty(
                "attendeeEmails",
                "attendee@example.com",
            );
            expect(eventWithDetails.extendedProps).toHaveProperty("attendeeCount", "1");
        });

        it("should handle malformed iCal data gracefully", async () => {
            const malformedICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:malformed@example.com
DTSTART:INVALID_DATE
SUMMARY:Malformed Event
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(malformedICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            const result = await calendarService.fetchAndProcessCalendar(
                calendar.id,
                sampleCalendar.url,
            );

            expect(result.events).toHaveLength(0);
            expect(result.publicEvents).toHaveLength(0);
            expect(result.authenticatedEvents).toHaveLength(0);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);
            expect(events).toHaveLength(0);
        });

        it("should throw error for completely invalid iCal data", async () => {
            const invalidICalData = `This is not valid iCal data at all`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(invalidICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await expect(
                calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url),
            ).rejects.toThrow("Failed to parse iCal data");
        });

        it("should handle all-day events correctly", async () => {
            const allDayICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:allday@example.com
DTSTART;VALUE=DATE:20250101
DTEND;VALUE=DATE:20250102
SUMMARY:All Day Event
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(allDayICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);

            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(1);
            expect(events[0]).toHaveProperty("allDay", true);
            expect(events[0]).toHaveProperty("start", "2025-01-01");
            expect(events[0]).toHaveProperty("end", "2025-01-02");
        });
    });

    describe("refetchAllCalendars", () => {
        it("should refetch all calendars and return results", async () => {
            global.fetch.mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(sampleICalData),
                    headers: { get: () => "text/calendar" },
                }),
            );

            await testServer.ctx.models.calendar.create({
                name: "Cal 1",
                url: "https://example.com/cal1.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            await testServer.ctx.models.calendar.create({
                name: "Cal 2",
                url: "https://example.com/cal2.ics",
                color: "#ff0000",
                visible_to_public: false,
                show_details_to_public: false,
            });

            const result = await calendarService.refetchAllCalendars();

            expect(result.total).toBe(2);
            expect(result.successful).toBe(2);
            expect(result.failed).toBe(0);
            expect(result.results).toHaveLength(2);
        });

        it("should handle mixed success and failure", async () => {
            let callCount = 0;
            global.fetch.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({
                        ok: true,
                        text: () => Promise.resolve(sampleICalData),
                        headers: { get: () => "text/calendar" },
                    });
                } else {
                    return Promise.reject(new Error("Network error"));
                }
            });

            await testServer.ctx.models.calendar.create({
                name: "Cal 1",
                url: "https://example.com/cal1.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            await testServer.ctx.models.calendar.create({
                name: "Cal 2",
                url: "https://example.com/cal2.ics",
                color: "#ff0000",
                visible_to_public: false,
                show_details_to_public: false,
            });

            const result = await calendarService.refetchAllCalendars();

            expect(result.total).toBe(2);
            expect(result.successful).toBe(1);
            expect(result.failed).toBe(1);
        });
    });

    describe("exportCalendars", () => {
        it("should export calendar configurations", async () => {
            await testServer.ctx.models.calendar.create({
                name: "Cal 1",
                url: "https://example.com/cal1.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            await testServer.ctx.models.calendar.create({
                name: "Cal 2",
                url: "https://example.com/cal2.ics",
                color: "#ff0000",
                visible_to_public: false,
                show_details_to_public: false,
            });

            const result = await calendarService.exportCalendars();

            expect(result.calendars).toHaveLength(2);
            expect(result.calendars[0]).toMatchObject({
                name: "Cal 1",
                url: "https://example.com/cal1.ics",
                color: "#447dfc",
                visible_to_public: 1,
                show_details_to_public: 1,
            });
            expect(result.calendars[1]).toMatchObject({
                name: "Cal 2",
                url: "https://example.com/cal2.ics",
                color: "#ff0000",
                visible_to_public: 0,
                show_details_to_public: 0,
            });
            expect(result).toHaveProperty("exportedAt");
            expect(result.version).toBe("1.0");
        });
    });

    describe("importCalendars", () => {
        it("should import valid calendar configurations", async () => {
            const calendarsData = [
                {
                    name: "Imported Cal",
                    url: "https://example.com/imported.ics",
                    color: "#00ff00",
                    visible_to_public: true,
                    show_details_to_public: false,
                },
            ];

            const result = await calendarService.importCalendars(
                calendarsData,
                testServer.ctx.utils,
            );

            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(0);
            expect(result.errors).toHaveLength(0);

            const calendars = await testServer.ctx.models.calendar.getAll();
            const importedCalendar = calendars.find((cal) => cal.name === "Imported Cal");
            expect(importedCalendar).toMatchObject({
                name: "Imported Cal",
                visible_to_public: 1,
                show_details_to_public: 0,
            });
            expect(importedCalendar.url).toBe("https://example.com/imported.ics");
            expect(importedCalendar.color).toBe("#00ff00");
        });

        it("should skip existing calendars", async () => {
            await testServer.ctx.models.calendar.create({
                name: "Existing Cal",
                url: "https://example.com/existing.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            const calendarsData = [
                {
                    name: "Existing Cal",
                    url: "https://example.com/existing.ics",
                },
            ];

            const result = await calendarService.importCalendars(
                calendarsData,
                testServer.ctx.utils,
            );

            expect(result.imported).toBe(0);
            expect(result.skipped).toBe(1);
            expect(result.errors).toHaveLength(0);

            const calendars = await testServer.ctx.models.calendar.getAll();
            const existingCalendars = calendars.filter(
                (cal) => cal.url === "https://example.com/existing.ics",
            );
            expect(existingCalendars).toHaveLength(1);
        });

        it("should handle validation errors", async () => {
            const calendarsData = [
                { name: "Valid Cal", url: "https://example.com/valid.ics" },
                { name: "", url: "https://example.com/invalid.ics" },
                { name: "Another Cal" },
            ];

            const result = await calendarService.importCalendars(
                calendarsData,
                testServer.ctx.utils,
            );

            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(0);
            expect(result.errors).toHaveLength(2);
            expect(result.errors[0].message).toBe("Name and URL are required");
            expect(result.errors[1].message).toBe("Name and URL are required");

            const calendars = await testServer.ctx.models.calendar.getAll();
            const validCalendar = calendars.find((cal) => cal.name === "Valid Cal");
            expect(validCalendar).toMatchObject({
                name: "Valid Cal",
                url: "https://example.com/valid.ics",
            });
        });

        it("should throw ValidationError for non-array input", async () => {
            await expect(
                calendarService.importCalendars("not an array", testServer.ctx.utils),
            ).rejects.toThrow("Calendars must be an array");
        });
    });

    describe("parseICalToEvents", () => {
        it("should parse basic event properties correctly", async () => {
            const realWorldICalData = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:adamgibbons/ics
METHOD:PUBLISH
X-WR-CALNAME:Real Calendar
X-PUBLISHED-TTL:PT1H
BEGIN:VEVENT
UID:test-event@example.com
SUMMARY:Real Event Title
DTSTART:20251005T020000Z
DTEND:20251005T050000Z
DESCRIPTION:Real event description with\\nline breaks
LOCATION:Real Location, Real City, Real Country
DTSTAMP:20250927T201556Z
STATUS:CONFIRMED
DURATION:PT3H
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(realWorldICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);
            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(1);
            const event = events[0];

            expect(event).toMatchObject({
                uid: "test-event@example.com",
                title: "Real Event Title",
                description: "Real event description with\nline breaks",
                location: "Real Location, Real City, Real Country",
                start: "2025-10-05T02:00:00.000Z",
                end: "2025-10-05T05:00:00.000Z",
                allDay: false,
                dtStamp: "2025-09-27T20:15:56.000Z",
                status: "CONFIRMED",
            });
        });

        it("should handle timezone and floating time correctly", async () => {
            const timezoneICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:floating-time@example.com
SUMMARY:Floating Time Event
DTSTART:20251005T140000
DTEND:20251005T150000
DESCRIPTION:Event with floating time
END:VEVENT
BEGIN:VEVENT
UID:utc-time@example.com
SUMMARY:UTC Time Event
DTSTART:20251005T140000Z
DTEND:20251005T150000Z
DESCRIPTION:Event with UTC time
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(timezoneICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);
            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(2);

            const floatingEvent = events.find((e) => e.uid === "floating-time@example.com");
            const utcEvent = events.find((e) => e.uid === "utc-time@example.com");

            expect(floatingEvent.start).toBe("2025-10-05T14:00:00");
            expect(floatingEvent.end).toBe("2025-10-05T15:00:00");

            expect(utcEvent.start).toBe("2025-10-05T14:00:00.000Z");
            expect(utcEvent.end).toBe("2025-10-05T15:00:00.000Z");
        });
    });

    describe("buildFullCalendarEvents", () => {
        it("should build correct FullCalendar event structure", async () => {
            const complexICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:complex-event@example.com
SUMMARY:Complex Event
DTSTART:20251005T020000Z
DTEND:20251005T050000Z
DESCRIPTION:Complex event with all fields
LOCATION:Complex Location
ORGANIZER;CN=John Organizer:mailto:john@example.com
ATTENDEE;CN=Jane Attendee;ROLE=REQ-PARTICIPANT:mailto:jane@example.com
ATTENDEE;CN=Bob Attendee;ROLE=OPT-PARTICIPANT:mailto:bob@example.com
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:1
URL:https://example.com/event
CREATED:20240101T120000Z
LAST-MODIFIED:20240102T120000Z
DTSTAMP:20240103T120000Z
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(complexICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: true,
                show_details_to_public: true,
            });

            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const publicEvents = JSON.parse(updatedCalendar.events_public);

            expect(publicEvents).toHaveLength(1);
            const fcEvent = publicEvents[0];

            expect(fcEvent).toMatchObject({
                title: "Complex Event",
                start: "2025-10-05T02:00:00.000Z",
                end: "2025-10-05T05:00:00.000Z",
                allDay: false,
                url: "https://example.com/event",
            });

            expect(fcEvent.extendedProps).toMatchObject({
                description: "Complex event with all fields",
                location: "Complex Location",
                uid: "complex-event@example.com",
                status: "CONFIRMED",
                transparency: "OPAQUE",
                sequence: "1",
                organizerEmail: "john@example.com",
                attendeeNames: "Jane Attendee, Bob Attendee",
                attendeeEmails: "jane@example.com, bob@example.com",
                attendeeCount: "2",
                created: "2024-01-01T12:00:00.000Z",
                lastModified: "2024-01-02T12:00:00.000Z",
                dtStamp: "2024-01-03T12:00:00.000Z",
                show_details_to_public: true,
            });
        });

        it("should strip sensitive data for public view when show_details_to_public is false", async () => {
            const sensitiveICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:sensitive-event@example.com
SUMMARY:Private Meeting
DTSTART:20251005T020000Z
DTEND:20251005T050000Z
DESCRIPTION:Confidential meeting details
LOCATION:Secret Location
ORGANIZER;CN=Private Organizer:mailto:private@example.com
ATTENDEE;CN=Secret Attendee:mailto:secret@example.com
URL:https://private.example.com/meeting
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sensitiveICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: true,
                show_details_to_public: false,
            });

            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const publicEvents = JSON.parse(updatedCalendar.events_public);
            const authenticatedEvents = JSON.parse(updatedCalendar.events_private);

            expect(publicEvents).toHaveLength(1);
            expect(authenticatedEvents).toHaveLength(1);

            const publicEvent = publicEvents[0];
            const authEvent = authenticatedEvents[0];

            expect(publicEvent).toMatchObject({
                title: "",
                start: "2025-10-05T02:00:00.000Z",
                end: "2025-10-05T05:00:00.000Z",
                allDay: false,
            });

            expect(publicEvent).not.toHaveProperty("url");
            expect(publicEvent.extendedProps).toMatchObject({
                description: "",
                location: "",
                uid: "sensitive-event@example.com",
                show_details_to_public: false,
            });

            expect(publicEvent.extendedProps).not.toHaveProperty("organizerEmail");
            expect(publicEvent.extendedProps).not.toHaveProperty("attendeeNames");

            expect(authEvent).toMatchObject({
                title: "Private Meeting",
                url: "https://private.example.com/meeting",
            });

            expect(authEvent.extendedProps).toMatchObject({
                description: "Confidential meeting details",
                location: "Secret Location",
                organizerEmail: "private@example.com",
                attendeeNames: "Secret Attendee",
                show_details_to_public: true,
            });
        });
    });

    describe("processEventsForViews", () => {
        it("should correctly separate public and authenticated events based on calendar settings", async () => {
            const mixedICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@example.com
SUMMARY:Public Event 1
DTSTART:20251005T020000Z
DTEND:20251005T050000Z
DESCRIPTION:Public description
END:VEVENT
BEGIN:VEVENT
UID:event2@example.com
SUMMARY:Public Event 2
DTSTART:20251006T020000Z
DTEND:20251006T050000Z
DESCRIPTION:Another public description
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mixedICalData),
                headers: { get: () => "text/calendar" },
            });

            const publicCalendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: true,
                show_details_to_public: true,
            });

            const privateCalendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/private.ics",
                visible_to_public: false,
                show_details_to_public: true,
            });

            await calendarService.fetchAndProcessCalendar(publicCalendar.id, sampleCalendar.url);
            await calendarService.fetchAndProcessCalendar(
                privateCalendar.id,
                "https://example.com/private.ics",
            );

            const publicCalendarData = await testServer.ctx.models.calendar.getById(
                publicCalendar.id,
            );
            const privateCalendarData = await testServer.ctx.models.calendar.getById(
                privateCalendar.id,
            );

            const publicCalendarPublicEvents = JSON.parse(publicCalendarData.events_public);
            const publicCalendarAuthEvents = JSON.parse(publicCalendarData.events_private);
            const privateCalendarPublicEvents = JSON.parse(privateCalendarData.events_public);
            const privateCalendarAuthEvents = JSON.parse(privateCalendarData.events_private);

            expect(publicCalendarPublicEvents).toHaveLength(2);
            expect(publicCalendarAuthEvents).toHaveLength(2);

            expect(privateCalendarPublicEvents).toHaveLength(0);
            expect(privateCalendarAuthEvents).toHaveLength(2);

            expect(publicCalendarPublicEvents[0].title).toBe("Public Event 1");
            expect(publicCalendarAuthEvents[0].title).toBe("Public Event 1");
            expect(privateCalendarAuthEvents[0].title).toBe("Public Event 1");
        });
    });

    describe("buildExtendedProps", () => {
        it("should build correct extended properties structure", async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
                headers: { get: () => "text/calendar" },
            });

            const testCalendar = await testServer.ctx.models.calendar.create({
                name: "Extended Props Test",
                url: "https://example.com/test.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            const result = await calendarService.fetchAndProcessCalendar(
                testCalendar.id,
                testCalendar.url,
            );

            expect(result.authenticatedEvents).toHaveLength(4);
            const event = result.authenticatedEvents[0];
            const extendedProps = event.extendedProps;

            expect(extendedProps).toHaveProperty("uid");
            expect(extendedProps).toHaveProperty("description", "This is a test event");
            expect(extendedProps).toHaveProperty("location", "Test Location");
            expect(extendedProps).toHaveProperty("status", "CONFIRMED");
            expect(extendedProps).toHaveProperty("sequence", "0");
            expect(extendedProps).toHaveProperty("duration", "");
            expect(extendedProps).toHaveProperty("transparency", "OPAQUE");

            expect(extendedProps).toHaveProperty("organizerEmail", "organizer@example.com");

            expect(extendedProps).toHaveProperty("attendeeNames", "Test Attendee");
            expect(extendedProps).toHaveProperty("attendeeEmails", "attendee@example.com");
            expect(extendedProps).toHaveProperty("attendeeCount", "1");

            expect(extendedProps).toHaveProperty("dtStamp");
            expect(extendedProps).toHaveProperty("created");
            expect(extendedProps).toHaveProperty("lastModified");
        });
    });

    describe("formatDateForCalendar", () => {
        it("should produce exact data structure matching real API output", async () => {
            const realUfcStyleData = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:adamgibbons/ics
METHOD:PUBLISH
X-WR-CALNAME:UFC-PPV
X-PUBLISHED-TTL:PT1H
BEGIN:VEVENT
UID:https://www.ufc.com/event/ufc-320
SUMMARY:UFC 320: Ankalaev vs Pereira 2
DTSTART:20251005T020000Z
DESCRIPTION:Main Card\\n--------------------\\n• Magomed Ankalaev (C) vs. Alex Pereira (#1) @205
LOCATION:T-Mobile Arena\\, Las Vegas\\, United States
DURATION:PT3H
DTSTAMP:20250927T201556Z
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(realUfcStyleData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                visible_to_public: true,
                show_details_to_public: true,
            });

            const result = await calendarService.fetchAndProcessCalendar(
                calendar.id,
                sampleCalendar.url,
            );

            expect(result).toHaveProperty("rawData");
            expect(result).toHaveProperty("events");
            expect(result).toHaveProperty("publicEvents");
            expect(result).toHaveProperty("authenticatedEvents");

            const event = result.events[0];
            expect(event).toMatchObject({
                uid: "https://www.ufc.com/event/ufc-320",
                title: "UFC 320: Ankalaev vs Pereira 2",
                description:
                    "Main Card\n--------------------\n• Magomed Ankalaev (C) vs. Alex Pereira (#1) @205",
                location: "T-Mobile Arena, Las Vegas, United States",
                start: "2025-10-05T02:00:00.000Z",
                allDay: false,
                dtStamp: "2025-09-27T20:15:56.000Z",
            });

            const publicEvent = result.publicEvents[0];
            expect(publicEvent).toMatchObject({
                title: "UFC 320: Ankalaev vs Pereira 2",
                start: "2025-10-05T02:00:00.000Z",
                allDay: false,
            });

            expect(publicEvent.extendedProps).toMatchObject({
                description:
                    "Main Card\n--------------------\n• Magomed Ankalaev (C) vs. Alex Pereira (#1) @205",
                location: "T-Mobile Arena, Las Vegas, United States",
                uid: "https://www.ufc.com/event/ufc-320",
                duration: "",
                status: "",
                transparency: "",
                sequence: "0",
                dtStamp: "2025-09-27T20:15:56.000Z",
                show_details_to_public: true,
            });

            expect(result.authenticatedEvents[0]).toMatchObject(publicEvent);
        });
    });
});
