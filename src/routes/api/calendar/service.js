export function createCalendarService(dependencies = {}) {
    async function fetchICalData(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Calendar-App/1.0'
                },
                timeout: 30000 // 30 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.text();
            return data;
        } catch (error) {
            throw new Error(`Failed to fetch iCal data from ${url}: ${error.message}`);
        }
    }

    function parseICalToEvents(icalData) {
        const events = [];
        const lines = icalData.split('\n').map(line => line.trim());

        let currentEvent = null;
        let inEvent = false;

        for (const line of lines) {
            if (line === 'BEGIN:VEVENT') {
                inEvent = true;
                currentEvent = {};
                continue;
            }

            if (line === 'END:VEVENT') {
                if (currentEvent) {
                    events.push(currentEvent);
                }
                inEvent = false;
                currentEvent = null;
                continue;
            }

            if (!inEvent || !currentEvent) {
                continue;
            }

            // Parse event properties
            if (line.startsWith('SUMMARY:')) {
                currentEvent.title = line.substring(8);
            } else if (line.startsWith('DTSTART')) {
                const { dateTime, allDay } = parseICalDateTime(line);
                if (dateTime) {
                    currentEvent.start = dateTime;
                    currentEvent.allDay = allDay;
                }
            } else if (line.startsWith('DTEND')) {
                const { dateTime } = parseICalDateTime(line);
                if (dateTime) {
                    currentEvent.end = dateTime;
                }
            } else if (line.startsWith('DESCRIPTION:')) {
                currentEvent.description = line.substring(12);
            } else if (line.startsWith('LOCATION:')) {
                currentEvent.location = line.substring(9);
            } else if (line.startsWith('UID:')) {
                currentEvent.uid = line.substring(4);
            } else if (line.startsWith('URL:')) {
                currentEvent.url = line.substring(4);
            } else if (line.startsWith('DURATION:')) {
                currentEvent.duration = line.substring(9);
            } else if (line.startsWith('DTSTAMP:')) {
                currentEvent.dtStamp = parseICalTimestamp(line.substring(8));
            } else if (line.startsWith('STATUS:')) {
                currentEvent.status = line.substring(7);
            } else if (line.startsWith('TRANSP:')) {
                currentEvent.transparency = line.substring(7);
            } else if (line.startsWith('SEQUENCE:')) {
                const seq = parseInt(line.substring(9));
                if (!isNaN(seq)) {
                    currentEvent.sequence = seq;
                }
            } else if (line.startsWith('ORGANIZER')) {
                const organizer = parseOrganizer(line);
                if (organizer) {
                    currentEvent.organizer = organizer;
                }
            } else if (line.startsWith('ATTENDEE')) {
                const attendee = parseAttendee(line);
                if (attendee) {
                    if (!currentEvent.attendees) {
                        currentEvent.attendees = [];
                    }
                    currentEvent.attendees.push(attendee);
                }
            } else if (line.startsWith('CREATED:')) {
                currentEvent.created = parseICalTimestamp(line.substring(8));
            } else if (line.startsWith('LAST-MODIFIED:')) {
                currentEvent.lastModified = parseICalTimestamp(line.substring(14));
            }
        }

        return events;
    }

    function parseICalDateTime(dtLine) {
        // Extract the datetime value using regex
        const match = dtLine.match(/DT(?:START|END)[^:]*:(.+)/);
        if (!match) {
            return { dateTime: null, allDay: false };
        }

        const dateStr = match[1];

        // Check if it's an all-day event (date only, no time)
        if (dateStr.length === 8) { // YYYYMMDD
            try {
                const year = parseInt(dateStr.substring(0, 4));
                const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
                const day = parseInt(dateStr.substring(6, 8));
                return {
                    dateTime: new Date(year, month, day).toISOString().split('T')[0],
                    allDay: true
                };
            } catch (error) {
                return { dateTime: null, allDay: false };
            }
        }

        // Parse datetime formats
        const formats = [
            { pattern: /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, utc: true },  // UTC
            { pattern: /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, utc: false }   // Local time
        ];

        for (const format of formats) {
            const match = dateStr.match(format.pattern);
            if (match) {
                try {
                    const [, year, month, day, hour, minute, second] = match;
                    const date = new Date(
                        parseInt(year),
                        parseInt(month) - 1, // JS months are 0-indexed
                        parseInt(day),
                        parseInt(hour),
                        parseInt(minute),
                        parseInt(second)
                    );

                    if (format.utc) {
                        return { dateTime: date.toISOString(), allDay: false };
                    } else {
                        return { dateTime: date.toISOString(), allDay: false };
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        return { dateTime: null, allDay: false };
    }

    function parseICalTimestamp(dateStr) {
        const formats = [
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, // UTC
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/   // Local time
        ];

        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                try {
                    const [, year, month, day, hour, minute, second] = match;
                    const date = new Date(
                        parseInt(year),
                        parseInt(month) - 1,
                        parseInt(day),
                        parseInt(hour),
                        parseInt(minute),
                        parseInt(second)
                    );
                    return date.toISOString();
                } catch (error) {
                    continue;
                }
            }
        }

        return null;
    }

    function parseOrganizer(line) {
        const organizer = {};

        // Extract email from ORGANIZER line (format: ORGANIZER;CN=Name:mailto:email)
        if (line.includes('mailto:')) {
            const emailStart = line.indexOf('mailto:') + 7;
            organizer.email = line.substring(emailStart);
        }

        // Extract name from CN parameter
        const cnMatch = line.match(/CN=([^;:]+)/);
        if (cnMatch) {
            organizer.name = cnMatch[1];
        }

        if (!organizer.email && !organizer.name) {
            return null;
        }

        return organizer;
    }

    function parseAttendee(line) {
        const attendee = {};

        // Extract email from ATTENDEE line
        if (line.includes('mailto:')) {
            const emailStart = line.indexOf('mailto:') + 7;
            attendee.email = line.substring(emailStart);
        }

        // Extract name from CN parameter
        const cnMatch = line.match(/CN=([^;:]+)/);
        if (cnMatch) {
            attendee.name = cnMatch[1];
        }

        // Extract role from ROLE parameter
        const roleMatch = line.match(/ROLE=([^;:]+)/);
        if (roleMatch) {
            attendee.role = roleMatch[1];
        }

        // Extract participation status from PARTSTAT parameter
        const statusMatch = line.match(/PARTSTAT=([^;:]+)/);
        if (statusMatch) {
            attendee.status = statusMatch[1];
        }

        // Extract type from CUTYPE parameter
        const typeMatch = line.match(/CUTYPE=([^;:]+)/);
        if (typeMatch) {
            attendee.type = typeMatch[1];
        }

        if (!attendee.email && !attendee.name) {
            return null;
        }

        return attendee;
    }

    async function fetchAndProcessCalendar(calendarId, url, ctx) {
    try {
        ctx.logger.info(`Fetching calendar data for ID ${calendarId} from ${url}`);

        // Fetch the raw iCal data
        const rawData = await fetchICalData(url);

        // Parse the iCal data into events
        const events = parseICalToEvents(rawData);

        ctx.logger.info(`Parsed ${events.length} events from calendar ${calendarId}`);

        // Update the calendar with the raw data and processed events
        await ctx.models.calendar.update(calendarId, {
            data: rawData,
            events: JSON.stringify(events)
        });

        ctx.logger.info(`Successfully updated calendar ${calendarId} with ${events.length} events`);

        return {
            rawData,
            events
        };

    } catch (error) {
        ctx.logger.error(`Failed to fetch calendar ${calendarId}:`, error);

        // Update calendar with error status or empty data
        try {
            await ctx.models.calendar.update(calendarId, {
                data: null,
                events: JSON.stringify([])
            });
        } catch (updateError) {
            ctx.logger.error(`Failed to update calendar ${calendarId} with error state:`, updateError);
        }

        throw error;
    }
}

    async function refetchAllCalendars(ctx) {
    try {
        const calendars = await ctx.models.calendar.getAll();

        ctx.logger.info(`Refetching ${calendars.length} calendars`);

        const results = [];

        for (const calendar of calendars) {
            try {
                const result = await fetchAndProcessCalendar(calendar.id, calendar.url, ctx);
                results.push({ success: true, calendarId: calendar.id, ...result });
            } catch (error) {
                ctx.logger.error(`Failed to refetch calendar ${calendar.id}:`, error);
                results.push({
                    success: false,
                    calendarId: calendar.id,
                    error: error.message
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        ctx.logger.info(`Refetch complete: ${successful} successful, ${failed} failed`);

        return {
            total: calendars.length,
            successful,
            failed,
            results
        };

    } catch (error) {
        ctx.logger.error('Failed to refetch calendars:', error);
        throw error;
    }
}

    return {
        fetchAndProcessCalendar,
        refetchAllCalendars
    };
}
