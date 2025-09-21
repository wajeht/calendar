export function createCalendarService(dependencies = {}) {
    const { ICAL, logger, models } = dependencies;

    if (!ICAL) throw new Error("ICAL required for calendar service");
    if (!models) throw new Error("Models required for calendar service");
    if (!logger) throw new Error("Logger required for calendar service");

    function formatDateForCalendar(icalTime) {
        if (icalTime.isDate) {
            return icalTime.toJSDate().toISOString().split("T")[0];
        }

        // Handle floating times (no timezone) as local time - this fixes the timezone issue
        if (!icalTime.zone || icalTime.zone.tzid === "floating" || icalTime.zone.tzid === "UTC") {
            const localDate = new Date(
                icalTime.year,
                icalTime.month - 1,
                icalTime.day,
                icalTime.hour,
                icalTime.minute,
                icalTime.second,
            );
            return localDate.toISOString();
        }

        return icalTime.toJSDate().toISOString();
    }

    async function fetchICalData(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Calendar-App/1.0",
                    Accept: "text/calendar, application/calendar, text/plain",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get("content-type");
            if (contentType && !contentType.includes("calendar") && !contentType.includes("text")) {
                logger.warn(`Unexpected content type: ${contentType} for ${url}`);
            }

            return await response.text();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === "AbortError") {
                throw new Error(`Request timeout after 30s for ${url}`);
            }
            throw new Error(`Failed to fetch iCal data from ${url}: ${error.message}`);
        }
    }

    function parseICalToEvents(icalData) {
        try {
            logger.debug("Parsing iCal data with ical.js...");

            const jCalData = ICAL.parse(icalData);
            const comp = new ICAL.Component(jCalData);
            const vevents = comp.getAllSubcomponents("vevent");

            logger.debug(`Found ${vevents.length} VEVENT components`);

            const events = [];
            const now = new Date();
            const futureLimit = new Date();
            futureLimit.setFullYear(now.getFullYear() + 2);

            // Convert to ICAL.Time for proper comparison
            const rangeStart = ICAL.Time.fromJSDate(now, false);
            const rangeEnd = ICAL.Time.fromJSDate(futureLimit, false);

            for (let i = 0; i < vevents.length; i++) {
                const vevent = vevents[i];
                try {
                    const event = new ICAL.Event(vevent);
                    logger.debug(
                        `Processing event: ${event.summary}, recurring: ${event.isRecurring()}`,
                    );

                    if (event.isRecurring()) {
                        // Use RecurExpansion for recurring events - this handles RRULE, RDATE, EXDATE automatically
                        logger.debug(`Expanding recurring event: ${event.summary}`);

                        const expand = new ICAL.RecurExpansion({
                            component: vevent,
                            dtstart: vevent.getFirstPropertyValue("dtstart"),
                        });

                        let next;
                        let count = 0;

                        while (
                            (next = expand.next()) &&
                            count < 1000 &&
                            next.compare(rangeEnd) < 0
                        ) {
                            if (next.compare(rangeStart) < 0) {
                                continue; // Skip dates before our range
                            }

                            const eventInstance = createEventFromOccurrence(event, next);
                            events.push(eventInstance);
                            count++;
                        }

                        logger.debug(
                            `Created ${count} instances for recurring event: ${event.summary}`,
                        );
                    } else {
                        // Single event or modified instance
                        logger.debug(
                            `Adding single/modified event: ${event.summary}, UID: ${event.uid}`,
                        );
                        events.push(createEventFromIcal(event));
                    }
                } catch (eventError) {
                    logger.error("Error processing event:", eventError.message);
                }
            }

            logger.debug(`Successfully parsed ${events.length} total events`);
            return events;
        } catch (error) {
            logger.error("Error parsing iCal data:", error);
            throw new Error(`Failed to parse iCal data: ${error.message}`);
        }
    }

    function createEventFromIcal(icalEvent) {
        const event = {
            uid: icalEvent.uid,
            title: icalEvent.summary || "Untitled Event",
            description: icalEvent.description || "",
            location: icalEvent.location || "",
            start: formatDateForCalendar(icalEvent.startDate),
            allDay: icalEvent.startDate.isDate,
        };

        if (icalEvent.endDate) {
            event.end = formatDateForCalendar(icalEvent.endDate);
        }

        addEventProperties(event, icalEvent);
        return event;
    }

    function createEventFromOccurrence(originalEvent, occurrenceDate) {
        const event = {
            uid: `${originalEvent.uid}_${occurrenceDate.toJSDate().getTime()}`,
            title: originalEvent.summary || "Untitled Event",
            description: originalEvent.description || "",
            location: originalEvent.location || "",
            start: formatDateForCalendar(occurrenceDate),
            allDay: occurrenceDate.isDate,
        };

        // Calculate end time if original event has duration
        if (originalEvent.endDate && originalEvent.startDate) {
            const durationMs =
                originalEvent.endDate.toJSDate().getTime() -
                originalEvent.startDate.toJSDate().getTime();
            const endOccurrence = occurrenceDate.clone();
            endOccurrence.addDuration(ICAL.Duration.fromSeconds(durationMs / 1000));
            event.end = formatDateForCalendar(endOccurrence);
        }

        addEventProperties(event, originalEvent);
        return event;
    }

    function addEventProperties(event, icalEvent) {
        // Add organizer
        if (icalEvent.organizer) {
            try {
                event.organizer = {
                    name:
                        (typeof icalEvent.organizer.getParameter === "function"
                            ? icalEvent.organizer.getParameter("cn")
                            : "") || "",
                    email:
                        (typeof icalEvent.organizer.getFirstValue === "function"
                            ? icalEvent.organizer.getFirstValue()?.replace("mailto:", "")
                            : icalEvent.organizer.toString().replace("mailto:", "")) || "",
                };
            } catch (error) {
                // Fallback for organizer as string value
                const organizerStr = icalEvent.organizer.toString();
                event.organizer = {
                    name: "",
                    email: organizerStr.replace("mailto:", "") || "",
                };
            }
        }

        // Add attendees
        if (icalEvent.attendees && icalEvent.attendees.length > 0) {
            const attendees = [];
            for (let i = 0; i < icalEvent.attendees.length; i++) {
                const attendee = icalEvent.attendees[i];
                try {
                    attendees[i] = {
                        name:
                            (typeof attendee.getParameter === "function"
                                ? attendee.getParameter("cn")
                                : "") || "",
                        email:
                            (typeof attendee.getFirstValue === "function"
                                ? attendee.getFirstValue()?.replace("mailto:", "")
                                : attendee.toString().replace("mailto:", "")) || "",
                        role:
                            (typeof attendee.getParameter === "function"
                                ? attendee.getParameter("role")
                                : "") || "",
                        status:
                            (typeof attendee.getParameter === "function"
                                ? attendee.getParameter("partstat")
                                : "") || "",
                        type:
                            (typeof attendee.getParameter === "function"
                                ? attendee.getParameter("cutype")
                                : "") || "",
                    };
                } catch (error) {
                    // Fallback for attendee as string value
                    const attendeeStr = attendee.toString();
                    attendees[i] = {
                        name: "",
                        email: attendeeStr.replace("mailto:", "") || "",
                        role: "",
                        status: "",
                        type: "",
                    };
                }
            }
            event.attendees = attendees;
        }

        // Add timestamps
        const created = icalEvent.component.getFirstPropertyValue("created");
        if (created) event.created = created.toJSDate().toISOString();

        const lastModified = icalEvent.component.getFirstPropertyValue("last-modified");
        if (lastModified) event.lastModified = lastModified.toJSDate().toISOString();

        const dtStamp = icalEvent.component.getFirstPropertyValue("dtstamp");
        if (dtStamp) event.dtStamp = dtStamp.toJSDate().toISOString();

        // Add other properties
        const status = icalEvent.component.getFirstPropertyValue("status");
        if (status) event.status = status;

        const transparency = icalEvent.component.getFirstPropertyValue("transp");
        if (transparency) event.transparency = transparency;

        const sequence = icalEvent.component.getFirstPropertyValue("sequence");
        if (sequence !== null) event.sequence = sequence;

        const url = icalEvent.component.getFirstPropertyValue("url");
        if (url) event.url = url;
    }

    function buildExtendedProps(event) {
        const props = {
            description: event.description || "",
            location: event.location || "",
            uid: event.uid || "",
            duration: event.duration || "",
            status: event.status || "",
            transparency: event.transparency || "",
            sequence: event.sequence ? String(event.sequence) : "0",
        };

        // Add timestamp fields if they exist
        if (event.dtStamp) props.dtStamp = event.dtStamp;
        if (event.created) props.created = event.created;
        if (event.lastModified) props.lastModified = event.lastModified;

        // Add organizer information if it exists
        if (event.organizer) {
            if (event.organizer.name) props.organizerName = event.organizer.name;
            if (event.organizer.email) props.organizerEmail = event.organizer.email;
        }

        // Add attendee information if it exists
        if (event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0) {
            const attendeeNames = [];
            const attendeeEmails = [];

            for (const attendee of event.attendees) {
                if (attendee.name) attendeeNames.push(attendee.name);
                if (attendee.email) attendeeEmails.push(attendee.email);
            }

            if (attendeeNames.length > 0) props.attendeeNames = attendeeNames.join(", ");
            if (attendeeEmails.length > 0) props.attendeeEmails = attendeeEmails.join(", ");
            props.attendeeCount = String(event.attendees.length);
        }

        return props;
    }

    function buildFullCalendarEvents(calendar, events) {
        if (!events || events.length === 0) return [];

        const validEvents = [];
        const skippedEvents = [];

        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            // Skip events without valid start date or title
            if (!event.start && !event.title) {
                skippedEvents.push({
                    reason: "No start date or title",
                    event: event.uid || "unknown",
                });
                continue;
            }

            // Check if this should hide event details (based on calendar settings or empty event details)
            const shouldHideDetails =
                !calendar.show_details_to_public ||
                (event.title === "" && event.description === "" && event.location === "");

            const fcEvent = {
                title: event.title || (shouldHideDetails ? "" : "Untitled Event"),
                start: event.start,
                allDay: event.allDay || false,
                backgroundColor: calendar.color,
                borderColor: calendar.color,
                textColor: "white",
                extendedProps: {
                    ...buildExtendedProps(event),
                    show_details_to_public: !shouldHideDetails,
                },
            };

            if (event.end) fcEvent.end = event.end;
            if (event.url) fcEvent.url = event.url;

            validEvents.push(fcEvent);
        }

        if (skippedEvents.length > 0) {
            logger.debug("Skipped", skippedEvents.length, "invalid events:", skippedEvents);
        }

        return validEvents;
    }

    function processEventsForViews(events, calendar) {
        if (!events || events.length === 0) {
            return {
                publicEvents: buildFullCalendarEvents(calendar, []),
                authenticatedEvents: buildFullCalendarEvents(calendar, events),
            };
        }

        const authenticatedEvents = buildFullCalendarEvents(calendar, events);
        let publicEvents;

        // If calendar is not visible to public, no public events at all
        if (!calendar.visible_to_public) {
            publicEvents = [];
        } else if (!calendar.show_details_to_public) {
            // If details should be hidden for public view, strip ALL sensitive information
            const strippedEvents = [];
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                strippedEvents[i] = {
                    uid: event.uid,
                    title: "", // Hide title completely
                    description: "", // Hide description completely
                    location: "", // Hide location completely
                    start: event.start,
                    end: event.end,
                    allDay: event.allDay,
                    // Remove all personal/sensitive details
                    organizer: null,
                    attendees: null,
                    status: event.status,
                    transparency: event.transparency,
                    sequence: event.sequence,
                    dtStamp: event.dtStamp,
                    created: event.created,
                    lastModified: event.lastModified,
                    url: null, // Hide URL as well
                };
            }
            publicEvents = buildFullCalendarEvents(calendar, strippedEvents);
        } else {
            // Show everything for public view
            publicEvents = buildFullCalendarEvents(calendar, events);
        }

        return { publicEvents, authenticatedEvents };
    }

    async function fetchAndProcessCalendar(calendarId, url) {
        try {
            logger.info(`Fetching calendar data for ID ${calendarId} from ${url}`);

            const rawData = await fetchICalData(url);
            const events = parseICalToEvents(rawData);

            logger.info(`Parsed ${events.length} events from calendar ${calendarId}`);

            const calendar = await models.calendar.getById(calendarId);
            if (!calendar) {
                throw new Error(`Calendar ${calendarId} not found`);
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
        try {
            const calendars = await models.calendar.getAll();
            logger.info(`Refetching ${calendars.length} calendars`);

            const results = [];

            for (let i = 0; i < calendars.length; i++) {
                const calendar = calendars[i];
                try {
                    const result = await fetchAndProcessCalendar(calendar.id, calendar.url);
                    results[i] = {
                        success: true,
                        calendarId: calendar.id,
                        ...result,
                    };
                } catch (error) {
                    logger.error(`Failed to refetch calendar ${calendar.id}:`, error);
                    results[i] = {
                        success: false,
                        calendarId: calendar.id,
                        message: error.message,
                    };
                }
            }

            let successful = 0;
            let failed = 0;
            for (let i = 0; i < results.length; i++) {
                if (results[i].success) {
                    successful++;
                } else {
                    failed++;
                }
            }

            logger.info(`Refetch complete: ${successful} successful, ${failed} failed`);

            return { total: calendars.length, successful, failed, results };
        } catch (error) {
            logger.error("Failed to refetch calendars:", error);
            throw error;
        }
    }

    async function exportCalendars() {
        try {
            const calendars = await models.calendar.getAll({ includeEvents: false });

            const exportData = calendars.map((calendar) => ({
                name: calendar.name,
                url: calendar.url,
                color: calendar.color,
                visible_to_public: calendar.visible_to_public,
                show_details_to_public: calendar.show_details_to_public,
            }));

            logger.info(`Exported ${exportData.length} calendars`);

            return {
                calendars: exportData,
                exportedAt: new Date().toISOString(),
                version: "1.0",
            };
        } catch (error) {
            logger.error("Calendar export failed:", error);
            throw error;
        }
    }

    async function importCalendars(calendarsData, utils) {
        try {
            if (!Array.isArray(calendarsData)) {
                throw new Error("Calendars must be an array");
            }

            const results = {
                imported: 0,
                skipped: 0,
                errors: [],
            };

            for (const calendarData of calendarsData) {
                try {
                    if (!calendarData.name || !calendarData.url) {
                        results.errors.push({
                            calendar: calendarData,
                            message: "Name and URL are required",
                        });
                        continue;
                    }

                    const existingCalendar = await models.calendar.getByUrl(calendarData.url);

                    if (existingCalendar) {
                        results.skipped++;
                        continue;
                    }

                    const sanitizedName = utils.sanitizeString(calendarData.name);

                    if (utils.isEmpty(sanitizedName)) {
                        results.errors.push({
                            calendar: calendarData,
                            message: "Calendar name cannot be empty after sanitization",
                        });
                        continue;
                    }

                    const newCalendarData = {
                        name: sanitizedName,
                        url: calendarData.url,
                        color: calendarData.color || utils.generateRandomColor(),
                        visible_to_public:
                            calendarData.visible_to_public !== undefined
                                ? calendarData.visible_to_public
                                : true,
                        show_details_to_public:
                            calendarData.show_details_to_public !== undefined
                                ? calendarData.show_details_to_public
                                : true,
                    };

                    await models.calendar.create(newCalendarData);
                    results.imported++;
                } catch (error) {
                    results.errors.push({
                        calendar: calendarData,
                        message: error.message,
                    });
                }
            }

            logger.info(
                `Calendar import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`,
            );

            return results;
        } catch (error) {
            logger.error("Calendar import failed:", error);
            throw error;
        }
    }

    return {
        fetchAndProcessCalendar,
        refetchAllCalendars,
        exportCalendars,
        importCalendars,
    };
}
