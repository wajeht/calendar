export function createCalendarService(dependencies = {}) {
    const { ICAL, logger, models, errors, utils } = dependencies;

    if (!errors) throw new Error("Errors required for calendar service");
    const {
        TimeoutError,
        NotFoundError,
        ICalParseError,
        ValidationError,
        CalendarFetchError,
        ConfigurationError,
    } = errors;

    if (!ICAL) throw new ConfigurationError("ICAL required for calendar service");
    if (!models) throw new ConfigurationError("Models required for calendar service");
    if (!logger) throw new ConfigurationError("Logger required for calendar service");
    if (!utils) throw new ConfigurationError("Utils required for calendar service");

    function formatDate(icalTime) {
        if (icalTime.isDate) {
            return icalTime.toJSDate().toISOString().split("T")[0];
        }

        // Floating times (no timezone) - preserve original values
        if (!icalTime.zone || icalTime.zone.tzid === "floating") {
            const pad = (n) => String(n).padStart(2, "0");
            return `${icalTime.year}-${pad(icalTime.month)}-${pad(icalTime.day)}T${pad(icalTime.hour)}:${pad(icalTime.minute)}:${pad(icalTime.second)}`;
        }

        return icalTime.toJSDate().toISOString();
    }

    function getPropertyValue(component, name) {
        const value = component.getFirstPropertyValue(name);
        return value ? value.toJSDate().toISOString() : null;
    }

    function parseAttendee(attendee) {
        const getParam = (name) =>
            typeof attendee.getParameter === "function" ? attendee.getParameter(name) || "" : "";
        const getEmail = () => {
            if (typeof attendee.getFirstValue === "function") {
                return (attendee.getFirstValue() || "").replace("mailto:", "");
            }
            return attendee.toString().replace("mailto:", "");
        };

        return {
            name: getParam("cn"),
            email: getEmail(),
            role: getParam("role"),
            status: getParam("partstat"),
            type: getParam("cutype"),
        };
    }

    function parseOrganizer(organizer) {
        if (!organizer) return null;

        const getName = () =>
            typeof organizer.getParameter === "function" ? organizer.getParameter("cn") || "" : "";
        const getEmail = () => {
            if (typeof organizer.getFirstValue === "function") {
                return (organizer.getFirstValue() || "").replace("mailto:", "");
            }
            return organizer.toString().replace("mailto:", "");
        };

        return { name: getName(), email: getEmail() };
    }

    function extractEventData(icalEvent) {
        const component = icalEvent.component;

        return {
            uid: icalEvent.uid,
            title: icalEvent.summary || "Untitled Event",
            description: icalEvent.description || "",
            location: icalEvent.location || "",
            allDay: icalEvent.startDate.isDate,
            organizer: parseOrganizer(icalEvent.organizer),
            attendees: icalEvent.attendees?.map(parseAttendee) || null,
            created: getPropertyValue(component, "created"),
            lastModified: getPropertyValue(component, "last-modified"),
            dtStamp: getPropertyValue(component, "dtstamp"),
            status: component.getFirstPropertyValue("status"),
            transparency: component.getFirstPropertyValue("transp"),
            sequence: component.getFirstPropertyValue("sequence"),
            url: component.getFirstPropertyValue("url"),
        };
    }

    function createEventFromIcal(icalEvent) {
        const event = {
            ...extractEventData(icalEvent),
            start: formatDate(icalEvent.startDate),
        };
        if (icalEvent.endDate) {
            event.end = formatDate(icalEvent.endDate);
        }
        return event;
    }

    function createEventFromOccurrence(icalEvent, occurrenceDate) {
        const event = {
            ...extractEventData(icalEvent),
            uid: `${icalEvent.uid}_${occurrenceDate.toJSDate().getTime()}`,
            start: formatDate(occurrenceDate),
            allDay: occurrenceDate.isDate,
        };

        // Calculate end time from duration
        if (icalEvent.endDate && icalEvent.startDate) {
            const durationMs = icalEvent.endDate.toJSDate() - icalEvent.startDate.toJSDate();
            const endDate = occurrenceDate.clone();
            endDate.addDuration(ICAL.Duration.fromSeconds(durationMs / 1000));
            event.end = formatDate(endDate);
        }

        return event;
    }

    function parseICalToEvents(icalData) {
        const jCalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jCalData);
        const vevents = comp.getAllSubcomponents("vevent");
        const events = [];

        for (const vevent of vevents) {
            try {
                const event = new ICAL.Event(vevent);

                // Skip recurrence exceptions - master event expansion handles occurrences
                if (event.isRecurrenceException()) continue;

                if (event.isRecurring()) {
                    const expand = new ICAL.RecurExpansion({
                        component: vevent,
                        dtstart: vevent.getFirstPropertyValue("dtstart"),
                    });

                    let next;
                    let count = 0;
                    // Limit: ~1 year of daily, ~7 years of weekly, ~30 years of monthly
                    while ((next = expand.next()) && count < 365) {
                        events.push(createEventFromOccurrence(event, next));
                        count++;
                    }
                } else {
                    events.push(createEventFromIcal(event));
                }
            } catch (err) {
                logger.error("Error processing event:", err.message);
            }
        }

        return events;
    }

    function buildExtendedProps(event) {
        const props = {
            description: event.description || "",
            location: event.location || "",
            uid: event.uid || "",
            duration: event.duration || "",
            status: event.status || "",
            transparency: event.transparency || "",
            sequence: event.sequence != null ? String(event.sequence) : "0",
        };

        if (event.dtStamp) props.dtStamp = event.dtStamp;
        if (event.created) props.created = event.created;
        if (event.lastModified) props.lastModified = event.lastModified;

        if (event.organizer) {
            if (event.organizer.name) props.organizerName = event.organizer.name;
            if (event.organizer.email) props.organizerEmail = event.organizer.email;
        }

        if (event.attendees?.length) {
            const names = event.attendees.map((a) => a.name).filter(Boolean);
            const emails = event.attendees.map((a) => a.email).filter(Boolean);
            if (names.length) props.attendeeNames = names.join(", ");
            if (emails.length) props.attendeeEmails = emails.join(", ");
            props.attendeeCount = String(event.attendees.length);
        }

        return props;
    }

    function toFullCalendarEvent(event, showDetailsToPublic) {
        const fcEvent = {
            title: event.title || (showDetailsToPublic ? "Untitled Event" : ""),
            start: event.start,
            allDay: event.allDay || false,
            extendedProps: {
                ...buildExtendedProps(event),
                show_details_to_public: showDetailsToPublic,
            },
        };

        if (event.end) fcEvent.end = event.end;
        if (event.url) fcEvent.url = event.url;

        return fcEvent;
    }

    function stripSensitiveData(event, showTitle) {
        return {
            uid: event.uid,
            title: showTitle ? event.title : "Private",
            description: "",
            location: "",
            start: event.start,
            end: event.end,
            allDay: event.allDay,
            organizer: null,
            attendees: null,
            status: event.status,
            transparency: event.transparency,
            sequence: event.sequence,
            dtStamp: event.dtStamp,
            created: event.created,
            lastModified: event.lastModified,
            url: null,
        };
    }

    function processEventsForViews(events, calendar) {
        if (!events?.length) {
            return { publicEvents: [], authenticatedEvents: [] };
        }

        const validEvents = events.filter((e) => e.start || e.title);

        const authenticatedEvents = validEvents.map((e) => toFullCalendarEvent(e, true));

        let publicEvents;
        if (!calendar.visible_to_public) {
            publicEvents = [];
        } else {
            // SQLite stores booleans as 0/1, convert to boolean
            const showDetails = Boolean(calendar.show_details_to_public);
            publicEvents = validEvents
                .map((e) => stripSensitiveData(e, showDetails))
                .map((e) => toFullCalendarEvent(e, showDetails));
        }

        return { publicEvents, authenticatedEvents };
    }

    async function fetchICalData(url) {
        const normalizedUrl = utils.normalizeCalendarUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(normalizedUrl, {
                headers: {
                    "User-Agent": "Calendar-App/1.0",
                    Accept: "text/calendar, application/calendar, text/plain",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new CalendarFetchError(`HTTP ${response.status}: ${response.statusText}`, {
                    status: response.status,
                    statusText: response.statusText,
                    url,
                });
            }

            return await response.text();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new TimeoutError(`Request timeout after 30s for ${url}`, 30000, {
                    cause: error,
                });
            }
            throw new CalendarFetchError(
                `Failed to fetch iCal data from ${url}: ${error.message}`,
                { url, normalizedUrl, originalError: error },
                { cause: error },
            );
        }
    }

    async function fetchAndProcessCalendar(calendarId, url) {
        try {
            logger.info(`Fetching calendar data for ID ${calendarId} from ${url}`);

            const rawData = await fetchICalData(url);

            let events;
            try {
                events = parseICalToEvents(rawData);
            } catch (error) {
                throw new ICalParseError(`Failed to parse iCal data: ${error.message}`, error, {
                    cause: error,
                });
            }

            logger.info(`Parsed ${events.length} events from calendar ${calendarId}`);

            const calendar = await models.calendar.getById(calendarId);
            if (!calendar) {
                throw new NotFoundError(`Calendar ${calendarId}`);
            }

            const { publicEvents, authenticatedEvents } = processEventsForViews(events, calendar);

            logger.info(
                `Processed ${publicEvents.length} public events and ${authenticatedEvents.length} authenticated events`,
            );

            await models.calendar.update(calendarId, {
                ical_data: rawData,
                events_processed: JSON.stringify(events),
                events_public: JSON.stringify(publicEvents),
                events_private: JSON.stringify(authenticatedEvents),
            });

            logger.info(`Successfully updated calendar ${calendarId} with ${events.length} events`);

            return { rawData, events, publicEvents, authenticatedEvents };
        } catch (error) {
            logger.error(`Failed to fetch calendar ${calendarId}:`, error);

            try {
                await models.calendar.update(calendarId, {
                    ical_data: null,
                    events_processed: JSON.stringify([]),
                    events_public: JSON.stringify([]),
                    events_private: JSON.stringify([]),
                });
            } catch (updateError) {
                logger.error(
                    `Failed to update calendar ${calendarId} with error state:`,
                    updateError,
                );
            }

            throw error;
        }
    }

    async function refetchAllCalendars() {
        const calendars = await models.calendar.getAll();
        logger.info(`Refetching ${calendars.length} calendars`);

        const results = [];
        for (const calendar of calendars) {
            try {
                const result = await fetchAndProcessCalendar(calendar.id, calendar.url);
                results.push({ success: true, calendarId: calendar.id, ...result });
            } catch (error) {
                logger.error(`Failed to refetch calendar ${calendar.id}:`, error);
                results.push({ success: false, calendarId: calendar.id, message: error.message });
            }
        }

        const successful = results.filter((r) => r.success).length;
        const failed = results.length - successful;

        logger.info(`Refetch complete: ${successful} successful, ${failed} failed`);

        return { total: calendars.length, successful, failed, results };
    }

    async function exportCalendars() {
        const calendars = await models.calendar.getAll({ includeEvents: false });

        logger.info(`Exported ${calendars.length} calendars`);

        return {
            calendars: calendars.map(
                ({ name, url, color, visible_to_public, show_details_to_public }) => ({
                    name,
                    url,
                    color,
                    visible_to_public,
                    show_details_to_public,
                }),
            ),
            exportedAt: new Date().toISOString(),
            version: "1.0",
        };
    }

    async function importCalendars(calendarsData, utils) {
        if (!Array.isArray(calendarsData)) {
            throw new ValidationError({ calendarsData: "Calendars must be an array" });
        }

        const results = { imported: 0, skipped: 0, errors: [] };

        for (const data of calendarsData) {
            try {
                if (!data.name || !data.url) {
                    results.errors.push({ calendar: data, message: "Name and URL are required" });
                    continue;
                }

                if (await models.calendar.getByUrl(data.url)) {
                    results.skipped++;
                    continue;
                }

                const name = utils.sanitizeString(data.name);
                if (utils.isEmpty(name)) {
                    results.errors.push({
                        calendar: data,
                        message: "Calendar name cannot be empty after sanitization",
                    });
                    continue;
                }

                await models.calendar.create({
                    name,
                    url: data.url,
                    color: data.color || utils.generateRandomColor(),
                    visible_to_public: data.visible_to_public ?? true,
                    show_details_to_public: data.show_details_to_public ?? true,
                });
                results.imported++;
            } catch (error) {
                results.errors.push({ calendar: data, message: error.message });
            }
        }

        logger.info(
            `Calendar import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`,
        );

        return results;
    }

    function combineCalendarsToIcal(calendars) {
        const lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Calendar App//Combined Feed//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Combined Calendar Feed",
        ];

        for (const calendar of calendars) {
            if (!calendar.ical_data) continue;
            const vevents = extractVEvents(calendar.ical_data);
            lines.push(...vevents);
        }

        lines.push("END:VCALENDAR");
        return lines.join("\r\n");
    }

    function extractVEvents(icalData) {
        const events = [];
        const lines = icalData.split(/\r?\n/);
        let inEvent = false;
        let currentEvent = [];

        for (const line of lines) {
            if (line === "BEGIN:VEVENT") {
                inEvent = true;
                currentEvent = [line];
            } else if (line === "END:VEVENT") {
                currentEvent.push(line);
                events.push(...currentEvent);
                inEvent = false;
                currentEvent = [];
            } else if (inEvent) {
                currentEvent.push(line);
            }
        }

        return events;
    }

    return {
        exportCalendars,
        importCalendars,
        refetchAllCalendars,
        fetchAndProcessCalendar,
        combineCalendarsToIcal,
    };
}
