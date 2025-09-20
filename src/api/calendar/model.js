export function createCalendar(dependencies = {}) {
    const { db, errors, utils } = dependencies;

    if (!db) throw new Error("Database required for calendar model");
    if (!errors) throw new Error("Errors required for calendar model");
    if (!utils) throw new Error("Utils required for calendar model");

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
            const { includeHidden = true, includeEvents = true } = options;

            try {
                let query = db("calendars");

                if (!includeHidden) {
                    query = query.where("hidden", false);
                }

                if (!includeEvents) {
                    query = query.select(
                        "id",
                        "name",
                        "url",
                        "color",
                        "hidden",
                        "details",
                        "created_at",
                        "updated_at",
                    );
                }

                return await query;
            } catch (error) {
                throw new DatabaseError("Failed to fetch calendars", error);
            }
        },

        /**
         * Get calendars filtered for public or authenticated access
         * @param {boolean} isAuthenticated - Whether user is authenticated
         * @returns {Promise<Calendar[]>} Array of filtered calendar objects
         */
        async getAllForAccess(isAuthenticated = false) {
            try {
                const fields = isAuthenticated
                    ? [
                          "id",
                          "name",
                          "url",
                          "color",
                          "hidden",
                          "details",
                          "events_authenticated",
                          "events",
                          "created_at",
                          "updated_at",
                      ]
                    : [
                          "id",
                          "name",
                          "color",
                          "hidden",
                          "details",
                          "events_public",
                          "events",
                          "created_at",
                          "updated_at",
                      ];

                let query = db("calendars").select(fields);

                if (!isAuthenticated) {
                    query = query.where("hidden", false);
                }

                const calendars = await query;

                const parseEvents = (eventsStr, fallbackStr) => {
                    if (eventsStr) {
                        try {
                            return JSON.parse(eventsStr);
                        } catch {}
                    }

                    if (fallbackStr) {
                        try {
                            return JSON.parse(fallbackStr);
                        } catch {
                            return [];
                        }
                    }
                    return [];
                };

                const result = [];
                for (let i = 0; i < calendars.length; i++) {
                    const calendar = calendars[i];

                    if (isAuthenticated) {
                        result[i] = {
                            id: calendar.id,
                            name: calendar.name,
                            url: calendar.url,
                            color: calendar.color,
                            hidden: calendar.hidden,
                            details: calendar.details,
                            events: parseEvents(calendar.events_authenticated, calendar.events),
                            created_at: calendar.created_at,
                            updated_at: calendar.updated_at,
                        };
                    } else {
                        result[i] = {
                            id: calendar.id,
                            name: calendar.name,
                            color: calendar.color,
                            hidden: calendar.hidden,
                            details: calendar.details,
                            events: parseEvents(calendar.events_public, calendar.events),
                            created_at: calendar.created_at,
                            updated_at: calendar.updated_at,
                        };
                    }
                }

                return result;
            } catch (error) {
                throw new DatabaseError("Failed to fetch calendars for access level", error);
            }
        },

        /**
         * Get calendar by ID
         * @param {number} id - Calendar ID
         * @returns {Promise<Calendar|null>} Calendar object or null
         */
        async getById(id) {
            if (!id || typeof id !== "number") {
                throw new ValidationError({
                    id: "Valid calendar ID is required",
                });
            }

            try {
                const calendar = await db("calendars").where("id", id).first();
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
            if (!url || typeof url !== "string") {
                throw new ValidationError({
                    url: "Valid calendar URL is required",
                });
            }

            try {
                const calendar = await db("calendars").where("url", url).first();
                return calendar || null;
            } catch (error) {
                throw new DatabaseError("Failed to fetch calendar by URL", error);
            }
        },

        /**
         * Create new calendar
         * @param {Object} data - Calendar data
         * @returns {Promise<Calendar>} Created calendar
         * @throws {ValidationError} When validation fails
         */
        async create(data) {
            const {
                name,
                url,
                color = "#447dfc",
                hidden = false,
                details = false,
                data: calendarData = null,
                events = null,
            } = data;

            try {
                const [id] = await db("calendars").insert({
                    name,
                    url,
                    color,
                    hidden,
                    details,
                    data: calendarData,
                    events,
                });

                return await db("calendars").where("id", id).first();
            } catch (error) {
                if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                    throw new ValidationError({
                        url: "Calendar with this URL already exists",
                    });
                }
                throw new DatabaseError("Failed to create calendar", error);
            }
        },

        /**
         * Update calendar
         * @param {number} id - Calendar ID
         * @param {Object} data - Update data
         * @returns {Promise<Calendar|null>} Updated calendar or null if not found
         */
        async update(id, data) {
            if (!id || typeof id !== "number") {
                throw new ValidationError({
                    id: "Valid calendar ID is required",
                });
            }

            if (!data || typeof data !== "object") {
                throw new ValidationError({
                    data: "Update data must be an object",
                });
            }

            // Only validate provided fields (partial validation)
            const updateData = {};
            const allowedFields = [
                "name",
                "url",
                "color",
                "hidden",
                "details",
                "data",
                "events",
                "events_public",
                "events_authenticated",
            ];

            for (const field of allowedFields) {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            }

            if (Object.keys(updateData).length === 0) {
                throw new ValidationError({
                    general: "At least one field must be provided for update",
                });
            }

            if (
                updateData.hidden !== undefined &&
                typeof updateData.hidden !== "boolean" &&
                updateData.hidden !== 0 &&
                updateData.hidden !== 1
            ) {
                throw new ValidationError({
                    hidden: "Hidden must be a boolean value or 0/1",
                });
            }

            if (
                updateData.details !== undefined &&
                typeof updateData.details !== "boolean" &&
                updateData.details !== 0 &&
                updateData.details !== 1
            ) {
                throw new ValidationError({
                    details: "Details must be a boolean value or 0/1",
                });
            }

            try {
                const updated = await db("calendars").where("id", id).update(updateData);

                if (updated === 0) {
                    return null;
                }

                return await db("calendars").where("id", id).first();
            } catch (error) {
                if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                    throw new ValidationError({
                        url: "Calendar with this URL already exists",
                    });
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
            if (!id || typeof id !== "number") {
                throw new ValidationError({
                    id: "Valid calendar ID is required",
                });
            }

            try {
                const calendar = await db("calendars").where("id", id).first();
                if (!calendar) {
                    return null;
                }

                await db("calendars").where("id", id).del();
                return calendar;
            } catch (error) {
                throw new DatabaseError(`Failed to delete calendar ${id}`, error);
            }
        },
    };
}
