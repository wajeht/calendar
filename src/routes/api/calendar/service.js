export function createCalendarService(dependencies = {}) {
    const { ICAL, logger, models } = dependencies;

    if (!ICAL) { throw new Error('ICAL library is required in dependencies'); }
    if (!models) throw new Error('Models is required required in dependencies');
    if (!logger) throw new Error('Logger is required required in dependencies');

    async function fetchICalData(url) {
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Calendar-App/1.0' },
                timeout: 30000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            throw new Error(`Failed to fetch iCal data from ${url}: ${error.message}`);
        }
    }

    function parseICalToEvents(icalData) {
        try {
            logger.debug('Parsing iCal data with ical.js...');
            const jcalData = ICAL.parse(icalData);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents('vevent');

            logger.debug(`Found ${vevents.length} VEVENT components`);

            const events = [];
            const now = new Date();
            const futureLimit = new Date();
            futureLimit.setFullYear(now.getFullYear() + 2);

            for (const vevent of vevents) {
                try {
                    const event = new ICAL.Event(vevent);
                    logger.debug(`Processing event: ${event.summary}, recurring: ${event.isRecurring()}`);

                    if (event.isRecurring()) {
                        // Handle recurring events using RecurExpansion
                        logger.debug(`Expanding recurring event: ${event.summary}`);

                        const expand = new ICAL.RecurExpansion({
                            component: vevent,
                            dtstart: event.startDate
                        });

                        let next;
                        let count = 0;
                        while ((next = expand.next()) && count < 1000 && next.toJSDate() <= futureLimit) {
                            const eventInstance = createEventFromOccurrence(event, next);
                            events.push(eventInstance);
                            count++;
                        }
                    } else {
                        // Single event
                        events.push(createEventFromIcal(event));
                    }
                } catch (eventError) {
                    logger.error('Error processing event:', eventError.message);
                }
            }

            logger.debug(`Successfully parsed ${events.length} total events`);
            return events;
        } catch (error) {
            logger.error('Error parsing iCal data:', error);
            throw new Error(`Failed to parse iCal data: ${error.message}`);
        }
    }

    function createEventFromIcal(icalEvent) {
        const event = {
            uid: icalEvent.uid,
            title: icalEvent.summary || 'Untitled Event',
            description: icalEvent.description || '',
            location: icalEvent.location || '',
            start: icalEvent.startDate.toJSDate().toISOString(),
            allDay: icalEvent.startDate.isDate
        };

        if (icalEvent.endDate) {
            event.end = icalEvent.endDate.toJSDate().toISOString();
        }

        // Add additional properties
        addEventProperties(event, icalEvent);

        return event;
    }

    function createEventFromOccurrence(originalEvent, occurrenceDate) {
        const event = {
            uid: `${originalEvent.uid}_${occurrenceDate.toJSDate().getTime()}`,
            title: originalEvent.summary || 'Untitled Event',
            description: originalEvent.description || '',
            location: originalEvent.location || '',
            start: occurrenceDate.toJSDate().toISOString(),
            allDay: occurrenceDate.isDate
        };

        // Calculate end time if original event has duration
        if (originalEvent.endDate && originalEvent.startDate) {
            const durationMs = originalEvent.endDate.toJSDate().getTime() - originalEvent.startDate.toJSDate().getTime();
            const endDate = new Date(occurrenceDate.toJSDate().getTime() + durationMs);
            event.end = endDate.toISOString();
        }

        // Add additional properties
        addEventProperties(event, originalEvent);

        return event;
    }

    function addEventProperties(event, icalEvent) {
        // Add organizer
        if (icalEvent.organizer) {
            try {
                event.organizer = {
                    name: (typeof icalEvent.organizer.getParameter === 'function' ? icalEvent.organizer.getParameter('cn') : '') || '',
                    email: (typeof icalEvent.organizer.getFirstValue === 'function' ? icalEvent.organizer.getFirstValue()?.replace('mailto:', '') : icalEvent.organizer.toString().replace('mailto:', '')) || ''
                };
            } catch (error) {
                // Fallback for organizer as string value
                const organizerStr = icalEvent.organizer.toString();
                event.organizer = {
                    name: '',
                    email: organizerStr.replace('mailto:', '') || ''
                };
            }
        }

        // Add attendees
        if (icalEvent.attendees && icalEvent.attendees.length > 0) {
            event.attendees = icalEvent.attendees.map(attendee => {
                try {
                    return {
                        name: (typeof attendee.getParameter === 'function' ? attendee.getParameter('cn') : '') || '',
                        email: (typeof attendee.getFirstValue === 'function' ? attendee.getFirstValue()?.replace('mailto:', '') : attendee.toString().replace('mailto:', '')) || '',
                        role: (typeof attendee.getParameter === 'function' ? attendee.getParameter('role') : '') || '',
                        status: (typeof attendee.getParameter === 'function' ? attendee.getParameter('partstat') : '') || '',
                        type: (typeof attendee.getParameter === 'function' ? attendee.getParameter('cutype') : '') || ''
                    };
                } catch (error) {
                    // Fallback for attendee as string value
                    const attendeeStr = attendee.toString();
                    return {
                        name: '',
                        email: attendeeStr.replace('mailto:', '') || '',
                        role: '',
                        status: '',
                        type: ''
                    };
                }
            });
        }

        // Add timestamps
        const created = icalEvent.component.getFirstPropertyValue('created');
        if (created) event.created = created.toJSDate().toISOString();

        const lastModified = icalEvent.component.getFirstPropertyValue('last-modified');
        if (lastModified) event.lastModified = lastModified.toJSDate().toISOString();

        const dtStamp = icalEvent.component.getFirstPropertyValue('dtstamp');
        if (dtStamp) event.dtStamp = dtStamp.toJSDate().toISOString();

        // Add other properties
        const status = icalEvent.component.getFirstPropertyValue('status');
        if (status) event.status = status;

        const transparency = icalEvent.component.getFirstPropertyValue('transp');
        if (transparency) event.transparency = transparency;

        const sequence = icalEvent.component.getFirstPropertyValue('sequence');
        if (sequence !== null) event.sequence = sequence;

        const url = icalEvent.component.getFirstPropertyValue('url');
        if (url) event.url = url;
    }

    async function fetchAndProcessCalendar(calendarId, url) {
        try {
            logger.info(`Fetching calendar data for ID ${calendarId} from ${url}`);

            const rawData = await fetchICalData(url);
            const events = parseICalToEvents(rawData);

            logger.info(`Parsed ${events.length} events from calendar ${calendarId}`);

            await models.calendar.update(calendarId, {
                data: rawData,
                events: JSON.stringify(events)
            });

            logger.info(`Successfully updated calendar ${calendarId} with ${events.length} events`);

            return { rawData, events };
        } catch (error) {
            logger.error(`Failed to fetch calendar ${calendarId}:`, error);

            try {
                await models.calendar.update(calendarId, {
                    data: null,
                    events: JSON.stringify([])
                });
            } catch (updateError) {
                logger.error(`Failed to update calendar ${calendarId} with error state:`, updateError);
            }

            throw error;
        }
    }

    async function refetchAllCalendars() {
        try {
            const calendars = await models.calendar.getAll();
            logger.info(`Refetching ${calendars.length} calendars`);

            const results = [];

            for (const calendar of calendars) {
                try {
                    const result = await fetchAndProcessCalendar(calendar.id, calendar.url);
                    results.push({ success: true, calendarId: calendar.id, ...result });
                } catch (error) {
                    logger.error(`Failed to refetch calendar ${calendar.id}:`, error);
                    results.push({
                        success: false,
                        calendarId: calendar.id,
                        error: error.message
                    });
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            logger.info(`Refetch complete: ${successful} successful, ${failed} failed`);

            return { total: calendars.length, successful, failed, results };
        } catch (error) {
            logger.error('Failed to refetch calendars:', error);
            throw error;
        }
    }

    return {
        fetchAndProcessCalendar,
        refetchAllCalendars
    };
}
