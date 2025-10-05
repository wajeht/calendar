export function createCalendar(dependencies = {}) {
    const { db, errors, utils } = dependencies;

    if (!errors) throw new Error("Errors required for calendar model");
    const { ConfigurationError } = errors;

    if (!db) throw new ConfigurationError("Database required for calendar model");
    if (!utils) throw new ConfigurationError("Utils required for calendar model");

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
                    query = query.where("visible_to_public", true);
                }

                if (!includeEvents) {
                    query = query.select(
                        "id",
                        "name",
                        "url",
                        "color",
                        "visible_to_public",
                        "show_details_to_public",
                        "created_at",
                        "updated_at",
                    );
                }

                return await query;
            } catch (error) {
                throw new DatabaseError("Failed to fetch calendars", error, { cause: error });
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
                          "visible_to_public",
                          "show_details_to_public",
                          "events_private",
                          "events_processed",
                          "created_at",
                          "updated_at",
                      ]
                    : [
                          "id",
                          "name",
                          "color",
                          "visible_to_public",
                          "show_details_to_public",
                          "events_public",
                          "events_processed",
                          "created_at",
                          "updated_at",
                      ];

                let query = db("calendars").select(fields);

                if (!isAuthenticated) {
                    query = query.where("visible_to_public", true);
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
                            visible_to_public: calendar.visible_to_public,
                            show_details_to_public: calendar.show_details_to_public,
                            events: parseEvents(calendar.events_private, calendar.events_processed),
                            created_at: calendar.created_at,
                            updated_at: calendar.updated_at,
                        };
                    } else {
                        result[i] = {
                            id: calendar.id,
                            name: calendar.name,
                            color: calendar.color,
                            visible_to_public: calendar.visible_to_public,
                            show_details_to_public: calendar.show_details_to_public,
                            events: parseEvents(calendar.events_public, calendar.events_processed),
                            created_at: calendar.created_at,
                            updated_at: calendar.updated_at,
                        };
                    }
                }

                return result;
            } catch (error) {
                throw new DatabaseError("Failed to fetch calendars for access level", error, {
                    cause: error,
                });
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
                throw new DatabaseError(`Failed to fetch calendar ${id}`, error, { cause: error });
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
                throw new DatabaseError("Failed to fetch calendar by URL", error, { cause: error });
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
                visible_to_public = true,
                show_details_to_public = true,
                ical_data: calendarData = null,
                events_processed = null,
            } = data;

            try {
                const [id] = await db("calendars").insert({
                    name,
                    url,
                    color,
                    visible_to_public,
                    show_details_to_public,
                    ical_data: calendarData,
                    events_processed,
                });

                return await db("calendars").where("id", id).first();
            } catch (error) {
                if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                    throw new ValidationError({
                        url: "Calendar with this URL already exists",
                    });
                }
                throw new DatabaseError("Failed to create calendar", error, { cause: error });
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
                "visible_to_public",
                "show_details_to_public",
                "ical_data",
                "events_processed",
                "events_public",
                "events_private",
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
                updateData.visible_to_public !== undefined &&
                typeof updateData.visible_to_public !== "boolean" &&
                updateData.visible_to_public !== 0 &&
                updateData.visible_to_public !== 1
            ) {
                throw new ValidationError({
                    visible_to_public: "Visible to public must be a boolean value or 0/1",
                });
            }

            if (
                updateData.show_details_to_public !== undefined &&
                typeof updateData.show_details_to_public !== "boolean" &&
                updateData.show_details_to_public !== 0 &&
                updateData.show_details_to_public !== 1
            ) {
                throw new ValidationError({
                    show_details_to_public: "Show details to public must be a boolean value or 0/1",
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
                throw new DatabaseError(`Failed to update calendar ${id}`, error, { cause: error });
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
                throw new DatabaseError(`Failed to delete calendar ${id}`, error, { cause: error });
            }
        },
    };
}
