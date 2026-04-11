import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
    afterEach,
    beforeAll,
    afterAll,
} from "vite-plus/test";
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

async function flushBackgroundFetch() {
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();
}

function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

describe("Calendar Service", () => {
    let testServer;
    let calendarService;
    let icalLibrary;

    function buildCalendarService(overrides = {}) {
        return createCalendarService({
            ICAL: icalLibrary,
            logger: testServer.ctx.logger,
            models: testServer.ctx.models,
            errors: testServer.ctx.errors,
            utils: testServer.ctx.utils,
            ...overrides,
        });
    }

    beforeAll(async () => {
        testServer = await createTestServer();
        await testServer.cleanDatabase();
        icalLibrary = testServer.ctx.ICAL || (await import("ical.js")).default;

        calendarService = buildCalendarService({
            ICAL: icalLibrary,
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
            ).rejects.toThrow("Request timeout after 30000ms");
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

        it("should preserve existing events on fetch error", async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(sampleICalData),
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);
            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const calendarWithEvents = await testServer.ctx.models.calendar.getById(calendar.id);
            const originalEvents = JSON.parse(calendarWithEvents.events_processed);
            expect(originalEvents.length).toBeGreaterThan(0);

            global.fetch.mockRejectedValueOnce(new Error("Network error"));

            try {
                await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);
            } catch {}

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            expect(JSON.parse(updatedCalendar.events_processed)).toEqual(originalEvents);
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

            await calendarService.fetchAndProcessCalendar(publicCalendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(publicCalendar.id);
            const publicEvents = JSON.parse(updatedCalendar.events_public);
            const authenticatedEvents = JSON.parse(updatedCalendar.events_private);

            expect(publicEvents).toHaveLength(4);
            expect(authenticatedEvents).toHaveLength(4);

            expect(publicEvents[0]).toHaveProperty("title", "Test Event 1");
            expect(publicEvents[0].extendedProps).toHaveProperty("description", "");
            expect(publicEvents[0].extendedProps).toHaveProperty("location", "");
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

            expect(publicEvents[0]).toHaveProperty("title", "Private");
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
                "organizerName",
                "Test Organizer",
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

    describe("export", () => {
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

            const result = await calendarService.export();

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

    describe("create", () => {
        it("should queue background sync after creating a calendar", async () => {
            const backgroundICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:created-background@example.com
DTSTART:20250110T100000Z
DTEND:20250110T110000Z
SUMMARY:Created Background Event
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(backgroundICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await calendarService.create({
                name: "Created Calendar",
                url: "https://example.com/created-background.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            await flushBackgroundFetch();

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            expect(updatedCalendar.ical_data).toContain("Created Background Event");

            const events = JSON.parse(updatedCalendar.events_processed);
            expect(events).toHaveLength(1);
            expect(events[0].title).toBe("Created Background Event");
        });
    });

    describe("update", () => {
        it("should reprocess events when the source URL changes", async () => {
            const updatedICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:updated-background@example.com
DTSTART:20250111T100000Z
DTEND:20250111T110000Z
SUMMARY:Updated Background Event
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(updatedICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                name: "Needs URL Update",
                url: "https://example.com/original-background.ics",
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            await calendarService.update(calendar.id, {
                url: "https://example.com/updated-background.ics",
            });

            await flushBackgroundFetch();

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            expect(updatedCalendar.url).toBe("https://example.com/updated-background.ics");
            expect(updatedCalendar.ical_data).toContain("Updated Background Event");

            const events = JSON.parse(updatedCalendar.events_processed);
            expect(events).toHaveLength(1);
            expect(events[0].title).toBe("Updated Background Event");
        });

        it("should rerun background sync with the latest URL when a previous sync is still pending", async () => {
            const originalUrl = "https://example.com/original-pending.ics";
            const updatedUrl = "https://example.com/updated-pending.ics";
            const originalFetch = createDeferred();

            const originalICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:original-background@example.com
DTSTART:20250112T100000Z
DTEND:20250112T110000Z
SUMMARY:Original Background Event
END:VEVENT
END:VCALENDAR`;

            const updatedICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:updated-background@example.com
DTSTART:20250113T100000Z
DTEND:20250113T110000Z
SUMMARY:Updated Background Event
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockImplementation((url) => {
                if (url === originalUrl) {
                    return originalFetch.promise;
                }

                if (url === updatedUrl) {
                    return Promise.resolve({
                        ok: true,
                        text: () => Promise.resolve(updatedICalData),
                        headers: { get: () => "text/calendar" },
                    });
                }

                throw new Error(`Unexpected fetch URL: ${url}`);
            });

            const calendar = await calendarService.create({
                name: "Pending Calendar",
                url: originalUrl,
                color: "#447dfc",
                visible_to_public: true,
                show_details_to_public: true,
            });

            await flushBackgroundFetch();

            await calendarService.update(calendar.id, {
                url: updatedUrl,
            });

            originalFetch.resolve({
                ok: true,
                text: () => Promise.resolve(originalICalData),
                headers: { get: () => "text/calendar" },
            });

            await flushBackgroundFetch();
            await flushBackgroundFetch();

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            expect(updatedCalendar.url).toBe(updatedUrl);
            expect(updatedCalendar.ical_data).toContain("Updated Background Event");

            const events = JSON.parse(updatedCalendar.events_processed);
            expect(events).toHaveLength(1);
            expect(events[0].title).toBe("Updated Background Event");
            expect(global.fetch).toHaveBeenCalledWith(
                originalUrl,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Accept: "text/calendar, application/calendar, text/plain",
                    }),
                }),
            );
            expect(global.fetch).toHaveBeenCalledWith(
                updatedUrl,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Accept: "text/calendar, application/calendar, text/plain",
                    }),
                }),
            );
        });
    });

    describe("import", () => {
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

            const result = await calendarService.import(calendarsData, testServer.ctx.utils);

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

            const result = await calendarService.import(calendarsData, testServer.ctx.utils);

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

            const result = await calendarService.import(calendarsData, testServer.ctx.utils);

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
                calendarService.import("not an array", testServer.ctx.utils),
            ).rejects.toThrow("Calendars must be an array");
        });

        it("should queue imported calendars for background sync", async () => {
            const importedICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:imported-background@example.com
DTSTART:20250112T100000Z
DTEND:20250112T110000Z
SUMMARY:Imported Background Event
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(importedICalData),
                headers: { get: () => "text/calendar" },
            });

            const result = await calendarService.import(
                [
                    {
                        name: "Imported With Sync",
                        url: "https://example.com/imported-background.ics",
                        color: "#00ff00",
                    },
                ],
                testServer.ctx.utils,
            );

            expect(result.imported).toBe(1);

            await flushBackgroundFetch();

            const importedCalendar = await testServer.ctx.models.calendar.getByUrl(
                "https://example.com/imported-background.ics",
            );
            expect(importedCalendar.ical_data).toContain("Imported Background Event");

            const events = JSON.parse(importedCalendar.events_processed);
            expect(events).toHaveLength(1);
            expect(events[0].title).toBe("Imported Background Event");
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
            });
            expect(fcEvent).not.toHaveProperty("url");

            expect(fcEvent.extendedProps).toMatchObject({
                description: "",
                location: "",
                uid: "complex-event@example.com",
                status: "CONFIRMED",
                transparency: "OPAQUE",
                sequence: "1",
                created: "2024-01-01T12:00:00.000Z",
                lastModified: "2024-01-02T12:00:00.000Z",
                dtStamp: "2024-01-03T12:00:00.000Z",
                show_details_to_public: true,
            });
            expect(fcEvent.extendedProps).not.toHaveProperty("organizerEmail");
            expect(fcEvent.extendedProps).not.toHaveProperty("attendeeNames");
            expect(fcEvent.extendedProps).not.toHaveProperty("attendeeEmails");
            expect(fcEvent.extendedProps).not.toHaveProperty("attendeeCount");
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
                title: "Private",
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

            expect(extendedProps).toHaveProperty("organizerName", "Test Organizer");
            expect(extendedProps).toHaveProperty("organizerEmail", "organizer@example.com");

            expect(extendedProps).toHaveProperty("attendeeNames", "Test Attendee");
            expect(extendedProps).toHaveProperty("attendeeEmails", "attendee@example.com");
            expect(extendedProps).toHaveProperty("attendeeCount", "1");

            expect(extendedProps).toHaveProperty("dtStamp");
            expect(extendedProps).toHaveProperty("created");
            expect(extendedProps).toHaveProperty("lastModified");
        });
    });

    describe("recurring events with RECURRENCE-ID", () => {
        it("should apply modified RECURRENCE-ID instances to the recurring series", async () => {
            // This iCal data simulates Google Calendar's pattern where:
            // 1. A master recurring event has an RRULE
            // 2. Modified instances have RECURRENCE-ID pointing to the original occurrence
            const recurringWithExceptionsICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-master@example.com
DTSTART:20251201T140000Z
DTEND:20251201T150000Z
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:Weekly Meeting
DESCRIPTION:Regular weekly meeting
END:VEVENT
BEGIN:VEVENT
UID:recurring-master@example.com
DTSTART:20251208T150000Z
DTEND:20251208T160000Z
RECURRENCE-ID:20251208T140000Z
SUMMARY:Weekly Meeting (Rescheduled)
DESCRIPTION:This instance was moved to a different time
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(recurringWithExceptionsICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create(sampleCalendar);
            await calendarService.fetchAndProcessCalendar(calendar.id, sampleCalendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(4);

            const modifiedEvent = events.find(
                (event) => event.start === "2025-12-08T15:00:00.000Z",
            );
            expect(modifiedEvent).toMatchObject({
                title: "Weekly Meeting (Rescheduled)",
                description: "This instance was moved to a different time",
                end: "2025-12-08T16:00:00.000Z",
            });

            const originalOccurrence = events.find(
                (event) => event.start === "2025-12-08T14:00:00.000Z",
            );
            expect(originalOccurrence).toBeUndefined();
        });

        it("should inherit master event data for partial RECURRENCE-ID overrides", async () => {
            const partialOverrideICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:partial-override@example.com
DTSTART:20251201T140000Z
DTEND:20251201T150000Z
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Weekly Meeting
DESCRIPTION:Master description
LOCATION:Room 101
ORGANIZER;CN=Team Lead:mailto:lead@example.com
ATTENDEE;CN=Member One:mailto:member@example.com
URL:https://example.com/master-event
END:VEVENT
BEGIN:VEVENT
UID:partial-override@example.com
RECURRENCE-ID:20251208T140000Z
DTSTART:20251208T160000Z
LAST-MODIFIED:20251202T090000Z
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(partialOverrideICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/partial-override.ics",
            });
            await calendarService.fetchAndProcessCalendar(calendar.id, calendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(3);

            const modifiedEvent = events.find(
                (event) => event.start === "2025-12-08T16:00:00.000Z",
            );

            expect(modifiedEvent).toMatchObject({
                title: "Weekly Meeting",
                description: "Master description",
                location: "Room 101",
                end: "2025-12-08T17:00:00.000Z",
                url: "https://example.com/master-event",
                organizer: {
                    name: "Team Lead",
                    email: "lead@example.com",
                },
                lastModified: "2025-12-02T09:00:00.000Z",
            });
            expect(modifiedEvent.attendees).toEqual([
                expect.objectContaining({
                    email: "member@example.com",
                    name: "Member One",
                }),
            ]);

            const originalOccurrence = events.find(
                (event) => event.start === "2025-12-08T14:00:00.000Z",
            );
            expect(originalOccurrence).toBeUndefined();
        });

        it("should fall back to the master schedule for metadata-only RECURRENCE-ID overrides without DTSTART", async () => {
            const metadataOnlyOverrideICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:metadata-only@example.com
DTSTART:20251201T140000Z
DTEND:20251201T150000Z
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Weekly Meeting
DESCRIPTION:Master description
END:VEVENT
BEGIN:VEVENT
UID:metadata-only@example.com
RECURRENCE-ID:20251208T140000Z
SUMMARY:Weekly Meeting (Metadata Override)
DESCRIPTION:This occurrence changed metadata only
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(metadataOnlyOverrideICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/metadata-only-override.ics",
            });
            await calendarService.fetchAndProcessCalendar(calendar.id, calendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(3);

            const overriddenOccurrence = events.find(
                (event) => event.start === "2025-12-08T14:00:00.000Z",
            );
            expect(overriddenOccurrence).toMatchObject({
                title: "Weekly Meeting (Metadata Override)",
                description: "This occurrence changed metadata only",
                end: "2025-12-08T15:00:00.000Z",
            });

            expect(
                events.find((event) => event.start === "2025-12-15T14:00:00.000Z"),
            ).toMatchObject({
                title: "Weekly Meeting",
                description: "Master description",
                end: "2025-12-15T15:00:00.000Z",
            });
        });

        it("should skip standalone events with RECURRENCE-ID", async () => {
            // This tests the case where we have orphan RECURRENCE-ID events
            // (modified instances without the master event in the same file)
            const orphanRecurrenceIdICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:single-event@example.com
DTSTART:20251201T100000Z
DTEND:20251201T110000Z
SUMMARY:Regular Single Event
DESCRIPTION:A normal single event
END:VEVENT
BEGIN:VEVENT
UID:orphan-modified@example.com
DTSTART:20251215T150000Z
DTEND:20251215T160000Z
RECURRENCE-ID:20251208T140000Z
SUMMARY:Orphan Modified Instance
DESCRIPTION:This is a modified instance without its master
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(orphanRecurrenceIdICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/orphan-test.ics",
            });
            await calendarService.fetchAndProcessCalendar(calendar.id, calendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            // Should only have 1 event - the single event
            // The orphan RECURRENCE-ID event should be skipped
            expect(events).toHaveLength(1);
            expect(events[0].title).toBe("Regular Single Event");
        });

        it("should handle semi-monthly recurring events correctly", async () => {
            // This simulates the AHOD Semi-Monthly pattern:
            // Two separate recurring events, each with BYDAY rules
            const semiMonthlyICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:first-wednesday@example.com
DTSTART:20251203T154500Z
DTEND:20251203T161500Z
RRULE:FREQ=MONTHLY;COUNT=3;BYDAY=1WE
SUMMARY:Semi-Monthly Meeting (1st Wed)
END:VEVENT
BEGIN:VEVENT
UID:third-wednesday@example.com
DTSTART:20251217T154500Z
DTEND:20251217T161500Z
RRULE:FREQ=MONTHLY;COUNT=3;BYDAY=3WE
SUMMARY:Semi-Monthly Meeting (3rd Wed)
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(semiMonthlyICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/semi-monthly.ics",
            });
            await calendarService.fetchAndProcessCalendar(calendar.id, calendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            // Should have 6 events total (3 from each recurring rule)
            expect(events).toHaveLength(6);

            const firstWedEvents = events.filter((e) => e.title.includes("1st Wed"));
            const thirdWedEvents = events.filter((e) => e.title.includes("3rd Wed"));

            expect(firstWedEvents).toHaveLength(3);
            expect(thirdWedEvents).toHaveLength(3);
        });

        it("should apply Google Calendar style modified instances without duplicating them", async () => {
            // Google Calendar creates UIDs with _R suffixes for "split" recurring events
            // This tests that we handle them correctly
            const googleStyleICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:abc123_R20251203T214500@google.com
DTSTART:20251203T154500Z
DTEND:20251203T161500Z
RRULE:FREQ=MONTHLY;COUNT=2;BYDAY=1WE
SUMMARY:Google Style Recurring
END:VEVENT
BEGIN:VEVENT
UID:abc123_R20251203T214500@google.com
DTSTART:20251203T164500Z
DTEND:20251203T171500Z
RECURRENCE-ID:20251203T154500Z
SUMMARY:Google Style Recurring (Modified)
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(googleStyleICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/google-style.ics",
            });
            await calendarService.fetchAndProcessCalendar(calendar.id, calendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(2);

            const modifiedEvent = events.find(
                (event) => event.start === "2025-12-03T16:45:00.000Z",
            );
            expect(modifiedEvent).toMatchObject({
                title: "Google Style Recurring (Modified)",
                end: "2025-12-03T17:15:00.000Z",
            });
        });

        it("should suppress minimally-defined cancelled recurring instances without truncating later occurrences", async () => {
            const cancelledOccurrenceICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:cancelled-master@example.com
DTSTART:20251201T140000Z
DTEND:20251201T150000Z
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Weekly Meeting
END:VEVENT
BEGIN:VEVENT
UID:cancelled-master@example.com
RECURRENCE-ID:20251208T140000Z
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

            global.fetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(cancelledOccurrenceICalData),
                headers: { get: () => "text/calendar" },
            });

            const calendar = await testServer.ctx.models.calendar.create({
                ...sampleCalendar,
                url: "https://example.com/cancelled-occurrence.ics",
            });
            await calendarService.fetchAndProcessCalendar(calendar.id, calendar.url);

            const updatedCalendar = await testServer.ctx.models.calendar.getById(calendar.id);
            const events = JSON.parse(updatedCalendar.events_processed);

            expect(events).toHaveLength(2);
            expect(
                events.find((event) => event.start === "2025-12-08T14:00:00.000Z"),
            ).toBeUndefined();
            expect(
                events.find((event) => event.start === "2025-12-15T14:00:00.000Z"),
            ).toMatchObject({
                title: "Weekly Meeting",
            });
        });
    });

    describe("combineCalendarsToIcal", () => {
        it("should combine multiple calendars into single iCal", async () => {
            const calendars = [
                {
                    id: 1,
                    name: "Calendar 1",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250101T100000Z
DTEND:20250101T110000Z
SUMMARY:Event 1
END:VEVENT
END:VCALENDAR`,
                },
                {
                    id: 2,
                    name: "Calendar 2",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event2@example.com
DTSTART:20250102T100000Z
DTEND:20250102T110000Z
SUMMARY:Event 2
END:VEVENT
END:VCALENDAR`,
                },
            ];

            const result = calendarService.combineCalendarsToIcal(calendars);

            expect(result).toContain("BEGIN:VCALENDAR");
            expect(result).toContain("END:VCALENDAR");
            expect(result).toContain("Event 1");
            expect(result).toContain("Event 2");
            // Should only have one VCALENDAR wrapper
            expect((result.match(/BEGIN:VCALENDAR/g) || []).length).toBe(1);
            expect((result.match(/END:VCALENDAR/g) || []).length).toBe(1);
            // Should have two VEVENTs
            expect((result.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
        });

        it("should handle empty calendar list", async () => {
            const result = calendarService.combineCalendarsToIcal([]);

            expect(result).toContain("BEGIN:VCALENDAR");
            expect(result).toContain("END:VCALENDAR");
            expect(result).not.toContain("BEGIN:VEVENT");
        });

        it("should skip calendars without ical_data", async () => {
            const calendars = [
                {
                    id: 1,
                    name: "Calendar with data",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250101T100000Z
SUMMARY:Has Data
END:VEVENT
END:VCALENDAR`,
                },
                {
                    id: 2,
                    name: "Calendar without data",
                    ical_data: null,
                },
                {
                    id: 3,
                    name: "Calendar with empty data",
                    ical_data: "",
                },
            ];

            const result = calendarService.combineCalendarsToIcal(calendars);

            expect(result).toContain("Has Data");
            expect((result.match(/BEGIN:VEVENT/g) || []).length).toBe(1);
        });

        it("should include proper iCal headers", async () => {
            const calendars = [
                {
                    id: 1,
                    name: "Test",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test@example.com
DTSTART:20250101T100000Z
SUMMARY:Test
END:VEVENT
END:VCALENDAR`,
                },
            ];

            const result = calendarService.combineCalendarsToIcal(calendars);

            expect(result).toContain("VERSION:2.0");
            expect(result).toContain("PRODID:");
            expect(result).toContain("CALSCALE:GREGORIAN");
            expect(result).toContain("METHOD:PUBLISH");
        });

        it("should handle calendars with multiple events", async () => {
            const calendars = [
                {
                    id: 1,
                    name: "Multi-event calendar",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250101T100000Z
SUMMARY:First Event
END:VEVENT
BEGIN:VEVENT
UID:event2@example.com
DTSTART:20250102T100000Z
SUMMARY:Second Event
END:VEVENT
BEGIN:VEVENT
UID:event3@example.com
DTSTART:20250103T100000Z
SUMMARY:Third Event
END:VEVENT
END:VCALENDAR`,
                },
            ];

            const result = calendarService.combineCalendarsToIcal(calendars);

            expect(result).toContain("First Event");
            expect(result).toContain("Second Event");
            expect(result).toContain("Third Event");
            expect((result.match(/BEGIN:VEVENT/g) || []).length).toBe(3);
        });

        it("should preserve VTIMEZONE blocks in the combined feed", async () => {
            const timezoneBlock = `BEGIN:VTIMEZONE
TZID:America/Chicago
BEGIN:STANDARD
DTSTART:20241103T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0600
TZNAME:CST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20240310T020000
TZOFFSETFROM:-0600
TZOFFSETTO:-0500
TZNAME:CDT
END:DAYLIGHT
END:VTIMEZONE`;

            const calendars = [
                {
                    id: 1,
                    name: "Timezone calendar",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
${timezoneBlock}
BEGIN:VEVENT
UID:tz-event-1@example.com
DTSTART;TZID=America/Chicago:20250101T090000
DTEND;TZID=America/Chicago:20250101T100000
SUMMARY:Timezone Event 1
END:VEVENT
END:VCALENDAR`,
                },
                {
                    id: 2,
                    name: "Timezone calendar 2",
                    ical_data: `BEGIN:VCALENDAR
VERSION:2.0
${timezoneBlock}
BEGIN:VEVENT
UID:tz-event-2@example.com
DTSTART;TZID=America/Chicago:20250102T090000
DTEND;TZID=America/Chicago:20250102T100000
SUMMARY:Timezone Event 2
END:VEVENT
END:VCALENDAR`,
                },
            ];

            const result = calendarService.combineCalendarsToIcal(calendars);

            expect(result).toContain("BEGIN:VTIMEZONE");
            expect(result).toContain("TZID:America/Chicago");
            expect((result.match(/BEGIN:VTIMEZONE/g) || []).length).toBe(1);
            expect(result).toContain("DTSTART;TZID=America/Chicago:20250101T090000");
            expect(result).toContain("DTSTART;TZID=America/Chicago:20250102T090000");
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
                description: "",
                location: "",
                uid: "https://www.ufc.com/event/ufc-320",
                duration: "",
                status: "",
                transparency: "",
                sequence: "0",
                dtStamp: "2025-09-27T20:15:56.000Z",
                show_details_to_public: true,
            });
            expect(publicEvent.extendedProps).not.toHaveProperty("organizerEmail");
            expect(publicEvent.extendedProps).not.toHaveProperty("attendeeNames");

            const authEvent = result.authenticatedEvents[0];
            expect(authEvent).toMatchObject({
                title: "UFC 320: Ankalaev vs Pereira 2",
                start: "2025-10-05T02:00:00.000Z",
                allDay: false,
            });
            expect(authEvent.extendedProps).toMatchObject({
                description:
                    "Main Card\n--------------------\n• Magomed Ankalaev (C) vs. Alex Pereira (#1) @205",
                location: "T-Mobile Arena, Las Vegas, United States",
                uid: "https://www.ufc.com/event/ufc-320",
                show_details_to_public: true,
            });
        });
    });
});
