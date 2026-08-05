import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { isPublicNetworkAddress } from "../../utils/network.js";

export function createCalendarService(dependencies = {}) {
    const { ICAL, logger, models, errors, utils, config } = dependencies;

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

    const fetchTimeout = config?.timeouts?.calendarFetch || 30000;
    const maxResponseBytes = config?.calendar?.maxResponseBytes || 5 * 1024 * 1024;
    const maxRedirects = config?.calendar?.maxRedirects || 5;
    const resolveHostname =
        dependencies.resolveHostname ||
        ((hostname) => dnsLookup(hostname, { all: true, verbatim: true }));
    const fetchCalendar = dependencies.fetchCalendar || fetchCalendarFromPublicAddress;
    const pendingFetches = new Map();

    function fetchCalendarFromPublicAddress(url, options) {
        const request = url.protocol === "https:" ? httpsRequest : httpRequest;

        return new Promise((resolve, reject) => {
            const calendarRequest = request(
                url,
                {
                    headers: options.headers,
                    signal: options.signal,
                    lookup: (_hostname, lookupOptions, callback) => {
                        const requestedFamily =
                            typeof lookupOptions === "number"
                                ? lookupOptions
                                : lookupOptions?.family;
                        const addresses = requestedFamily
                            ? options.addresses.filter(
                                  ({ family }) => family === Number(requestedFamily),
                              )
                            : options.addresses;

                        if (addresses.length === 0) {
                            const error = new Error("No validated address matches the request");
                            error.code = "ENOTFOUND";
                            callback(error);
                            return;
                        }

                        if (lookupOptions?.all) {
                            callback(null, addresses);
                            return;
                        }

                        callback(null, addresses[0].address, addresses[0].family);
                    },
                },
                (response) => {
                    resolve({
                        ok: response.statusCode >= 200 && response.statusCode < 300,
                        status: response.statusCode,
                        statusText: response.statusMessage,
                        headers: {
                            get(name) {
                                const value = response.headers[name.toLowerCase()];
                                return Array.isArray(value) ? value.join(", ") : value || null;
                            },
                        },
                        body: response,
                    });
                },
            );

            calendarRequest.on("error", reject);
            calendarRequest.end();
        });
    }

    function queueCalendarFetch(calendarId, errorMessage) {
        const existingFetch = pendingFetches.get(calendarId);
        if (existingFetch) {
            existingFetch.rerun = true;
            existingFetch.errorMessage = errorMessage;
            return;
        }

        const fetchState = {
            rerun: false,
            errorMessage,
        };

        pendingFetches.set(calendarId, fetchState);
        setImmediate(async () => {
            try {
                const calendar = await models.calendar.getById(calendarId);
                if (!calendar) {
                    return;
                }

                await fetchAndProcessCalendar(calendar.id, calendar.url);
            } catch (error) {
                logger.error(fetchState.errorMessage, {
                    calendar_id: calendarId,
                    error: error.message,
                });
            } finally {
                pendingFetches.delete(calendarId);

                if (fetchState.rerun) {
                    queueCalendarFetch(calendarId, fetchState.errorMessage);
                }
            }
        });
    }

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
        const startDate = icalEvent.startDate || component.getFirstPropertyValue("dtstart");
        const organizerProperty =
            typeof component.getFirstProperty === "function"
                ? component.getFirstProperty("organizer")
                : icalEvent.organizer;
        const attendeeProperties =
            typeof component.getAllProperties === "function"
                ? component.getAllProperties("attendee")
                : icalEvent.attendees;

        return {
            uid: icalEvent.uid,
            title: icalEvent.summary || "Untitled Event",
            description: icalEvent.description || "",
            location: icalEvent.location || "",
            allDay: Boolean(startDate?.isDate),
            organizer: parseOrganizer(organizerProperty),
            attendees: attendeeProperties?.map(parseAttendee) || null,
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

    function eventHasProperty(icalEvent, propertyName) {
        return Boolean(
            icalEvent?.component && typeof icalEvent.component.hasProperty === "function"
                ? icalEvent.component.hasProperty(propertyName)
                : false,
        );
    }

    function mergeEventData(masterEvent, overrideEvent) {
        const masterData = extractEventData(masterEvent);
        if (!overrideEvent || overrideEvent === masterEvent) {
            return masterData;
        }

        const overrideData = extractEventData(overrideEvent);
        const mergedData = { ...masterData };

        if (eventHasProperty(overrideEvent, "summary")) {
            mergedData.title = overrideData.title;
        }
        if (eventHasProperty(overrideEvent, "description")) {
            mergedData.description = overrideData.description;
        }
        if (eventHasProperty(overrideEvent, "location")) {
            mergedData.location = overrideData.location;
        }
        if (eventHasProperty(overrideEvent, "organizer")) {
            mergedData.organizer = overrideData.organizer;
        }
        if (eventHasProperty(overrideEvent, "attendee")) {
            mergedData.attendees = overrideData.attendees;
        }
        if (eventHasProperty(overrideEvent, "created")) {
            mergedData.created = overrideData.created;
        }
        if (eventHasProperty(overrideEvent, "last-modified")) {
            mergedData.lastModified = overrideData.lastModified;
        }
        if (eventHasProperty(overrideEvent, "dtstamp")) {
            mergedData.dtStamp = overrideData.dtStamp;
        }
        if (eventHasProperty(overrideEvent, "status")) {
            mergedData.status = overrideData.status;
        }
        if (eventHasProperty(overrideEvent, "transp")) {
            mergedData.transparency = overrideData.transparency;
        }
        if (eventHasProperty(overrideEvent, "sequence")) {
            mergedData.sequence = overrideData.sequence;
        }
        if (eventHasProperty(overrideEvent, "url")) {
            mergedData.url = overrideData.url;
        }

        return mergedData;
    }

    function createFallbackOccurrenceDetails(masterEvent, occurrence, exceptionComponent) {
        const exceptionEvent = new ICAL.Event(exceptionComponent);
        const recurrenceId =
            exceptionComponent.getFirstPropertyValue("recurrence-id") || occurrence;

        return {
            recurrenceId,
            item: exceptionEvent,
            startDate: occurrence,
            endDate: null,
        };
    }

    function getOccurrenceEndDate(masterEvent, occurrenceDetails) {
        const item = occurrenceDetails.item;

        if (
            item &&
            item !== masterEvent &&
            !eventHasProperty(item, "dtend") &&
            !eventHasProperty(item, "duration") &&
            masterEvent.duration
        ) {
            const inheritedEndDate = occurrenceDetails.startDate.clone();
            inheritedEndDate.addDuration(masterEvent.duration);
            return inheritedEndDate;
        }

        return occurrenceDetails.endDate || null;
    }

    function createEventFromOccurrenceDetails(masterEvent, occurrenceDetails) {
        const item = occurrenceDetails.item || masterEvent;
        const recurrenceId = occurrenceDetails.recurrenceId || occurrenceDetails.startDate;
        const endDate = getOccurrenceEndDate(masterEvent, occurrenceDetails);

        const event = {
            ...mergeEventData(masterEvent, item),
            uid: recurrenceId ? `${masterEvent.uid}_${recurrenceId.toString()}` : item.uid,
            start: formatDate(occurrenceDetails.startDate),
            allDay: occurrenceDetails.startDate.isDate,
        };

        if (endDate) {
            event.end = formatDate(endDate);
        }

        return event;
    }

    function getExceptionComponentsByUid(vevents) {
        const exceptionsByUid = new Map();

        for (const vevent of vevents) {
            if (!vevent.hasProperty("recurrence-id")) {
                continue;
            }

            const uid = vevent.getFirstPropertyValue("uid");
            if (!uid) {
                continue;
            }

            if (!exceptionsByUid.has(uid)) {
                exceptionsByUid.set(uid, {
                    components: [],
                    byRecurrenceId: new Map(),
                });
            }

            const exceptionState = exceptionsByUid.get(uid);
            exceptionState.components.push(vevent);

            const recurrenceId = vevent.getFirstPropertyValue("recurrence-id");
            if (recurrenceId) {
                exceptionState.byRecurrenceId.set(recurrenceId.toString(), vevent);

                if (recurrenceId.zone) {
                    exceptionState.byRecurrenceId.set(
                        recurrenceId.convertToZone(ICAL.Timezone.utcTimezone).toString(),
                        vevent,
                    );
                }
            }
        }

        return exceptionsByUid;
    }

    function isCancelledEvent(icalEvent) {
        const status = icalEvent?.component?.getFirstPropertyValue("status");
        return typeof status === "string" && status.toUpperCase() === "CANCELLED";
    }

    function isCancelledExceptionComponent(exceptionComponent) {
        const status = exceptionComponent?.getFirstPropertyValue("status");
        return typeof status === "string" && status.toUpperCase() === "CANCELLED";
    }

    function getDirectExceptionComponent(exceptionState, occurrence) {
        if (!exceptionState) {
            return null;
        }

        const directException =
            exceptionState.byRecurrenceId.get(occurrence.toString()) ||
            exceptionState.byRecurrenceId.get(
                occurrence.convertToZone(ICAL.Timezone.utcTimezone).toString(),
            );

        return directException || null;
    }

    function parseICalToEvents(icalData) {
        const jCalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jCalData);
        const vevents = comp.getAllSubcomponents("vevent");
        const exceptionComponentsByUid = getExceptionComponentsByUid(vevents);
        const events = [];
        let recurringCount = 0;
        let singleCount = 0;
        let skippedExceptions = 0;
        let cancelledOccurrences = 0;
        let parseErrors = 0;

        for (const vevent of vevents) {
            try {
                if (vevent.hasProperty("recurrence-id")) {
                    skippedExceptions++;
                    continue;
                }

                const uid = vevent.getFirstPropertyValue("uid");
                const exceptionState = uid ? exceptionComponentsByUid.get(uid) || null : null;
                const exceptionComponents = exceptionState?.components || [];
                const event = new ICAL.Event(vevent, {
                    exceptions: exceptionComponents,
                    strictExceptions: true,
                });

                if (event.isRecurring()) {
                    recurringCount++;
                    const expand = event.iterator();

                    let next;
                    let count = 0;
                    // Limit: ~1 year of daily, ~7 years of weekly, ~30 years of monthly
                    while ((next = expand.next()) && count < 365) {
                        const directException = getDirectExceptionComponent(exceptionState, next);
                        if (
                            directException &&
                            isCancelledExceptionComponent(directException) &&
                            !directException.hasProperty("dtstart")
                        ) {
                            cancelledOccurrences++;
                            count++;
                            continue;
                        }

                        let occurrenceDetails;
                        try {
                            occurrenceDetails = event.getOccurrenceDetails(next);
                        } catch (error) {
                            if (directException && isCancelledExceptionComponent(directException)) {
                                cancelledOccurrences++;
                                count++;
                                continue;
                            }

                            if (directException && !directException.hasProperty("dtstart")) {
                                occurrenceDetails = createFallbackOccurrenceDetails(
                                    event,
                                    next,
                                    directException,
                                );
                            } else {
                                throw error;
                            }
                        }

                        if (isCancelledEvent(occurrenceDetails.item)) {
                            cancelledOccurrences++;
                            count++;
                            continue;
                        }

                        events.push(createEventFromOccurrenceDetails(event, occurrenceDetails));
                        count++;
                    }
                } else {
                    singleCount++;
                    events.push(createEventFromIcal(event));
                }
            } catch (err) {
                parseErrors++;
                logger.warn("event parse error", {
                    error: err.message,
                    uid: vevent?.getFirstPropertyValue("uid"),
                });
            }
        }

        logger.set({
            vevent_count: vevents.length,
            recurring_events: recurringCount,
            single_events: singleCount,
            skipped_exceptions: skippedExceptions,
            cancelled_occurrences: cancelledOccurrences,
            parse_errors: parseErrors,
        });

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

    async function validateFetchUrl(url) {
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            throw new CalendarFetchError("Invalid calendar URL", { url }, { cause: error });
        }

        if (
            !["http:", "https:"].includes(parsedUrl.protocol) ||
            parsedUrl.username ||
            parsedUrl.password
        ) {
            throw new CalendarFetchError("Calendar URL must use HTTP(S) without credentials", {
                url,
            });
        }

        const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "");
        const family = isIP(hostname);
        const addresses = family
            ? [{ address: hostname, family }]
            : await resolveHostname(hostname);
        const resolvedAddresses = Array.isArray(addresses) ? addresses : [addresses];

        if (
            resolvedAddresses.length === 0 ||
            resolvedAddresses.some(({ address }) => !isPublicNetworkAddress(address))
        ) {
            throw new CalendarFetchError(
                "Calendar URL must resolve only to public network addresses",
                { url },
            );
        }

        return { url: parsedUrl, addresses: resolvedAddresses };
    }

    async function readResponseText(response, url) {
        const contentLength = Number(response.headers?.get?.("content-length"));
        if (Number.isFinite(contentLength) && contentLength > maxResponseBytes) {
            response.body?.destroy?.();
            throw new CalendarFetchError(
                `Calendar response exceeds ${maxResponseBytes} byte limit`,
                { url, maxResponseBytes },
            );
        }

        if (response.body?.[Symbol.asyncIterator] && !response.body?.getReader) {
            const decoder = new TextDecoder();
            let bytesRead = 0;
            let text = "";

            for await (const chunk of response.body) {
                bytesRead += chunk.byteLength;
                if (bytesRead > maxResponseBytes) {
                    response.body.destroy();
                    throw new CalendarFetchError(
                        `Calendar response exceeds ${maxResponseBytes} byte limit`,
                        { url, maxResponseBytes },
                    );
                }
                text += decoder.decode(chunk, { stream: true });
            }
            return text + decoder.decode();
        }

        if (!response.body?.getReader) {
            const text = await response.text();
            if (Buffer.byteLength(text) > maxResponseBytes) {
                throw new CalendarFetchError(
                    `Calendar response exceeds ${maxResponseBytes} byte limit`,
                    { url, maxResponseBytes },
                );
            }
            return text;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let bytesRead = 0;
        let text = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                bytesRead += value.byteLength;
                if (bytesRead > maxResponseBytes) {
                    await reader.cancel();
                    throw new CalendarFetchError(
                        `Calendar response exceeds ${maxResponseBytes} byte limit`,
                        { url, maxResponseBytes },
                    );
                }
                text += decoder.decode(value, { stream: true });
            }
            return text + decoder.decode();
        } finally {
            reader.releaseLock();
        }
    }

    async function fetchICalData(url) {
        let currentUrl = utils.normalizeCalendarUrl(url);
        const urlHost = new URL(currentUrl).host;
        const fetchStart = Date.now();

        try {
            let response;
            const signal = AbortSignal.timeout(fetchTimeout);

            for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
                const validatedTarget = await validateFetchUrl(currentUrl);
                response = await fetchCalendar(validatedTarget.url, {
                    addresses: validatedTarget.addresses,
                    headers: {
                        "User-Agent": "Calendar-App/1.0",
                        Accept: "text/calendar, application/calendar, text/plain",
                    },
                    redirect: "manual",
                    signal,
                });

                if (![301, 302, 303, 307, 308].includes(response.status)) break;

                response.body?.resume?.();
                const location = response.headers?.get?.("location");
                if (!location) {
                    throw new CalendarFetchError("Calendar redirect is missing a location", {
                        url: currentUrl,
                    });
                }
                if (redirectCount === maxRedirects) {
                    throw new CalendarFetchError(
                        `Calendar fetch exceeded ${maxRedirects} redirects`,
                        { url },
                    );
                }
                currentUrl = new URL(location, validatedTarget.url).href;
            }

            if (!response.ok) {
                response.body?.resume?.();
                throw new CalendarFetchError(`HTTP ${response.status}: ${response.statusText}`, {
                    status: response.status,
                    statusText: response.statusText,
                    url: currentUrl,
                });
            }

            const data = await readResponseText(response, currentUrl);

            logger.set({
                url_host: urlHost,
                fetch_ms: Date.now() - fetchStart,
                response_status: response.status,
                response_bytes: Buffer.byteLength(data),
            });

            return data;
        } catch (error) {
            logger.set({ url_host: urlHost, fetch_ms: Date.now() - fetchStart });

            if (
                error.name === "TimeoutError" ||
                (error.name === "AbortError" && error.cause?.name === "TimeoutError")
            ) {
                throw new TimeoutError(
                    `Request timeout after ${fetchTimeout}ms for ${url}`,
                    fetchTimeout,
                    { cause: error },
                );
            }
            throw new CalendarFetchError(
                `Failed to fetch iCal data from ${url}: ${error.message}`,
                { url, normalizedUrl: utils.normalizeCalendarUrl(url) },
                { cause: error },
            );
        }
    }

    async function fetchAndProcessCalendar(calendarId, url) {
        const startTime = Date.now();

        return logger.withContext({ calendar_id: calendarId }, async () => {
            try {
                const rawData = await fetchICalData(url);

                let events;
                try {
                    events = parseICalToEvents(rawData);
                } catch (error) {
                    throw new ICalParseError(`Failed to parse iCal data: ${error.message}`, {
                        cause: error,
                    });
                }

                const calendar = await models.calendar.getById(calendarId);
                if (!calendar) {
                    throw new NotFoundError(`Calendar ${calendarId}`);
                }

                const { publicEvents, authenticatedEvents } = processEventsForViews(
                    events,
                    calendar,
                );

                await models.calendar.update(calendarId, {
                    ical_data: rawData,
                    events_processed: JSON.stringify(events),
                    events_public: JSON.stringify(publicEvents),
                    events_private: JSON.stringify(authenticatedEvents),
                });

                logger.info("calendar sync complete", {
                    calendar_name: calendar.name,
                    visible_to_public: calendar.visible_to_public,
                    total_events: events.length,
                    public_events: publicEvents.length,
                    private_events: authenticatedEvents.length,
                    duration_ms: Date.now() - startTime,
                    success: true,
                });

                return { rawData, events, publicEvents, authenticatedEvents };
            } catch (error) {
                logger.error("calendar sync failed", {
                    error: error.message,
                    error_type: error.constructor.name,
                    duration_ms: Date.now() - startTime,
                    success: false,
                });

                throw error;
            }
        });
    }

    async function refetchAllCalendars() {
        const startTime = Date.now();
        const calendars = await models.calendar.getAll();

        const results = [];
        let totalEvents = 0;

        for (const calendar of calendars) {
            try {
                const result = await fetchAndProcessCalendar(calendar.id, calendar.url);
                totalEvents += result.events.length;
                results.push({ success: true, calendarId: calendar.id, ...result });
            } catch (error) {
                results.push({ success: false, calendarId: calendar.id, message: error.message });
            }
        }

        const successful = results.filter((r) => r.success).length;
        const failed = results.length - successful;

        logger.info("batch calendar sync complete", {
            total_calendars: calendars.length,
            successful,
            failed,
            total_events: totalEvents,
            duration_ms: Date.now() - startTime,
            calendars_processed: calendars.map((c) => c.name),
        });

        return { total: calendars.length, successful, failed, results };
    }

    async function exportCalendars() {
        const calendars = await models.calendar.getAll({ includeEvents: false });

        logger.info("exported calendars", { count: calendars.length });

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

    async function create(calendarData) {
        const calendar = await models.calendar.create(calendarData);

        queueCalendarFetch(calendar.id, "background calendar fetch failed");

        return calendar;
    }

    async function update(id, updateData) {
        const updatedCalendar = await models.calendar.update(id, updateData);

        if (
            updatedCalendar &&
            (updateData.url !== undefined ||
                updateData.visible_to_public !== undefined ||
                updateData.show_details_to_public !== undefined)
        ) {
            queueCalendarFetch(updatedCalendar.id, "background calendar reprocessing failed");
        }

        return updatedCalendar;
    }

    async function importCalendars(calendarsData, utils) {
        if (!Array.isArray(calendarsData)) {
            throw new ValidationError({ calendarsData: "Calendars must be an array" });
        }

        const MAX_IMPORT = 100;
        if (calendarsData.length > MAX_IMPORT) {
            throw new ValidationError({
                calendarsData: `Cannot import more than ${MAX_IMPORT} calendars at once`,
            });
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

                const calendar = await models.calendar.create({
                    name,
                    url: data.url,
                    color: data.color || utils.generateRandomColor(),
                    visible_to_public: data.visible_to_public ?? true,
                    show_details_to_public: data.show_details_to_public ?? true,
                });
                queueCalendarFetch(calendar.id, "background imported calendar fetch failed");
                results.imported++;
            } catch (error) {
                results.errors.push({ calendar: data, message: error.message });
            }
        }

        logger.info("calendar import completed", {
            imported: results.imported,
            skipped: results.skipped,
            errors: results.errors.length,
        });

        return results;
    }

    function combineCalendarsToIcal(calendars) {
        const sections = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Calendar App//Combined Feed//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Combined Calendar Feed",
        ];
        const seenTimezones = new Set();

        for (const calendar of calendars) {
            if (!calendar.ical_data) continue;

            const timezones = extractComponentBlocks(calendar.ical_data, "VTIMEZONE");
            for (const timezone of timezones) {
                if (seenTimezones.has(timezone)) {
                    continue;
                }

                seenTimezones.add(timezone);
                sections.push(timezone);
            }
        }

        for (const calendar of calendars) {
            if (!calendar.ical_data) continue;

            const vevents = extractComponentBlocks(calendar.ical_data, "VEVENT");
            sections.push(...vevents);
        }

        sections.push("END:VCALENDAR");
        return sections.join("\r\n");
    }

    function extractComponentBlocks(icalData, componentName) {
        const blocks = [];
        const lines = icalData.split(/\r?\n/);
        const beginMarker = `BEGIN:${componentName}`;
        const endMarker = `END:${componentName}`;
        let currentBlock = null;

        for (const line of lines) {
            if (line === beginMarker) {
                currentBlock = [line];
                continue;
            }

            if (currentBlock) {
                currentBlock.push(line);
                if (line === endMarker) {
                    blocks.push(currentBlock.join("\r\n"));
                    currentBlock = null;
                }
            }
        }

        return blocks;
    }

    return {
        create,
        export: exportCalendars,
        import: importCalendars,
        refetchAllCalendars,
        fetchAndProcessCalendar,
        combineCalendarsToIcal,
        update,
    };
}
