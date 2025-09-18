export function createCalendar(dependencies = {}) {
    const { db, errors, utils } = dependencies;

    if (!db) throw new Error('Database required for calendar model');
    if (!errors) throw new Error('Errors required for calendar model');
    if (!utils) throw new Error('Utils required for calendar model');

    const { ValidationError, DatabaseError } = errors;

    return {
        /**
         * Get all calendars with optional filtering
         * @param {Object} options - Query options
         * @param {boolean} [options.includeHidden=true] - Include hidden calendars
         * @param {boolean} [options.includeEvents=true] - Include events data
         * @returns {Promise<Calendar[]>} Array of calendar objects
         */
        async getAll(options = {}) {
            const {
                includeHidden = true,
                includeEvents = true
            } = options;

            try {
                let query = db('calendars');

                if (!includeHidden) {
                    query = query.where('hidden', false);
                }

                if (!includeEvents) {
                    query = query.select('id', 'name', 'url', 'color', 'hidden', 'details', 'created_at', 'updated_at');
                }

                return await query;
            } catch (error) {
                throw new DatabaseError('Failed to fetch calendars', error);
            }
        },

        /**
         * Get calendar by ID
         * @param {number} id - Calendar ID
         * @returns {Promise<Calendar|null>} Calendar object or null
         */
        async getById(id) {
            if (!id || typeof id !== 'number') {
                throw new ValidationError('Valid calendar ID is required');
            }

            try {
                const calendar = await db('calendars').where('id', id).first();
                return calendar || null;
            } catch (error) {
                throw new DatabaseError(`Failed to fetch calendar ${id}`, error);
            }
        },

        /**
         * Get calendar by URL
         * @param {string} url - Calendar URL
         * @returns {Promise<Calendar|null>} Calendar object or null
         */
        async getByUrl(url) {
            if (!url || typeof url !== 'string') {
                throw new ValidationError('Valid calendar URL is required');
            }

            try {
                const calendar = await db('calendars').where('url', url).first();
                return calendar || null;
            } catch (error) {
                throw new DatabaseError('Failed to fetch calendar by URL', error);
            }
        },

        /**
         * Create new calendar
         * @param {Object} data - Calendar data
         * @returns {Promise<Calendar>} Created calendar
         * @throws {ValidationError} When validation fails
         */
        async create(data) {
            if (!data || typeof data !== 'object') {
                throw new ValidationError('Calendar data must be an object');
            }

            const { name, url, color = '#3498db', hidden = false, details = false, data: calendarData = null, events = null } = data;

            // Validate required fields
            if (utils.isEmpty(name)) {
                throw new ValidationError('Calendar name is required', 'name');
            }

            if (typeof name !== 'string' || name.trim().length === 0) {
                throw new ValidationError('Calendar name must be a non-empty string', 'name');
            }

            if (utils.isEmpty(url)) {
                throw new ValidationError('Calendar URL is required', 'url');
            }

            if (!utils.validateCalendarUrl(url)) {
                throw new ValidationError('Invalid calendar URL format', 'url');
            }

            // Validate color format if provided
            if (color && !utils.validateHexColor(color)) {
                throw new ValidationError('Color must be a valid hex color (e.g., #3498db)', 'color');
            }

            try {
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
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    throw new ValidationError('Calendar with this URL already exists');
                }
                throw new DatabaseError('Failed to create calendar', error);
            }
        },

        /**
         * Update calendar
         * @param {number} id - Calendar ID
         * @param {Object} data - Update data
         * @returns {Promise<Calendar|null>} Updated calendar or null if not found
         */
        async update(id, data) {
            if (!id || typeof id !== 'number') {
                throw new ValidationError('Valid calendar ID is required');
            }

            if (!data || typeof data !== 'object') {
                throw new ValidationError('Update data must be an object');
            }

            // Only validate provided fields (partial validation)
            const updateData = {};
            const allowedFields = ['name', 'url', 'color', 'hidden', 'details', 'data', 'events'];

            for (const field of allowedFields) {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            }

            if (Object.keys(updateData).length === 0) {
                throw new ValidationError('At least one field must be provided for update');
            }

            // Validate specific fields if provided
            if (updateData.name !== undefined) {
                if (utils.isEmpty(updateData.name)) {
                    throw new ValidationError('Name cannot be empty', 'name');
                }
                if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
                    throw new ValidationError('Name must be a non-empty string', 'name');
                }
                updateData.name = updateData.name.trim();
            }

            if (updateData.url !== undefined) {
                if (utils.isEmpty(updateData.url)) {
                    throw new ValidationError('URL cannot be empty', 'url');
                }
                if (!utils.validateCalendarUrl(updateData.url)) {
                    throw new ValidationError('URL must be a valid calendar URL', 'url');
                }
            }

            if (updateData.color !== undefined && updateData.color !== null) {
                if (!utils.validateHexColor(updateData.color)) {
                    throw new ValidationError('Color must be a valid hex color (e.g., #3498db)', 'color');
                }
            }

            if (updateData.hidden !== undefined && typeof updateData.hidden !== 'boolean') {
                throw new ValidationError('Hidden must be a boolean value', 'hidden');
            }

            if (updateData.details !== undefined && typeof updateData.details !== 'boolean') {
                throw new ValidationError('Details must be a boolean value', 'details');
            }

            try {
                const updated = await db('calendars')
                    .where('id', id)
                    .update(updateData);

                if (updated === 0) {
                    return null;
                }

                return await this.getById(id);
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    throw new ValidationError('Calendar with this URL already exists');
                }
                throw new DatabaseError(`Failed to update calendar ${id}`, error);
            }
        },

        /**
         * Delete calendar
         * @param {number} id - Calendar ID
         * @returns {Promise<Calendar|null>} Deleted calendar or null if not found
         */
        async delete(id) {
            if (!id || typeof id !== 'number') {
                throw new ValidationError('Valid calendar ID is required');
            }

            try {
                const calendar = await this.getById(id);
                if (!calendar) {
                    return null;
                }

                await db('calendars').where('id', id).del();
                return calendar;
            } catch (error) {
                throw new DatabaseError(`Failed to delete calendar ${id}`, error);
            }
        },
    };
}
