export function createCalendar(db) {
    return {

        async getAll() {
            return await db('calendars').select('*');
        },

        async getById(id) {
            const calendar = await db('calendars').where('id', id).first();
            return calendar || null;
        },

        async create(data) {
            const { name, url, color = '#3498db', hidden = false, details = false, data: calendarData, events } = data;

            const [id] = await db('calendars').insert({
                name,
                url,
                color,
                hidden,
                details,
                data: calendarData,
                events
            });

            return await this.getById(id);
        },

        async update(id, data) {
            const { name, url, color, hidden, details, data: calendarData, events } = data;

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (url !== undefined) updateData.url = url;
            if (color !== undefined) updateData.color = color;
            if (hidden !== undefined) updateData.hidden = hidden;
            if (details !== undefined) updateData.details = details;
            if (calendarData !== undefined) updateData.data = calendarData;
            if (events !== undefined) updateData.events = events;

            const updated = await db('calendars')
                .where('id', id)
                .update(updateData);

            if (updated === 0) {
                return null;
            }

            return await this.getById(id);
        },

        async delete(id) {
            const calendar = await this.getById(id);
            if (!calendar) {
                return null;
            }

            await db('calendars').where('id', id).del();
            return calendar;
        },

        async getByUrl(url) {
            const calendar = await db('calendars').where('url', url).first();
            return calendar || null;
        },

        async getVisible() {
            return await db('calendars').where('hidden', false).select('*');
        },

        async getHidden() {
            return await db('calendars').where('hidden', true).select('*');
        },

        async toggleVisibility(id) {
            const calendar = await this.getById(id);
            if (!calendar) {
                return null;
            }

            const updated = await db('calendars')
                .where('id', id)
                .update({ hidden: !calendar.hidden });

            if (updated === 0) {
                return null;
            }

            return await this.getById(id);
        }
    };
}
