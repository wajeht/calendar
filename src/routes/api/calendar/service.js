import { fetchICalData, parseICalToEvents } from '../../../services/ical.js';

export async function fetchAndProcessCalendar(calendarId, url, ctx) {
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

export async function refetchAllCalendars(ctx) {
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
