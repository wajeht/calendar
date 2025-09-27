export function createValidators(dependencies = {}) {
    const { errors, utils } = dependencies;

    if (!errors) throw new Error("Errors required for validators");
    const { ConfigurationError } = errors;

    if (!utils) throw new ConfigurationError("Utils required for validators");

    const { ValidationError } = errors;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

    return {
        /**
         * Validate and parse ID, throwing ValidationError on failure
         * @param {string} idStr - ID string to validate
         * @returns {number} Parsed ID
         */
        validateId(idStr) {
            const id = utils.parseId(idStr);
            if (id === null) {
                throw new ValidationError({ id: "Invalid ID" });
            }
            return id;
        },

        /**
         * Validate request body, throwing ValidationError on failure
         * @param {any} body - Request body
         * @returns {Object} Validated body
         */
        validateBody(body) {
            if (!body || typeof body !== "object" || Array.isArray(body)) {
                throw new ValidationError({
                    body: "Request body must be a valid JSON object",
                });
            }
            return body;
        },

        /**
         * Validate hex color, throwing ValidationError on failure
         * @param {string} color - Color to validate
         * @param {string} field - Field name for error
         */
        validateColor(color, field = "color") {
            if (color && !this.validateHexColor(color)) {
                throw new ValidationError({
                    [field]: "Color must be a valid hex color (e.g., #447dfc)",
                });
            }
        },

        /**
         * Validate calendar name
         * @param {string} name - Name to validate
         * @param {string} field - Field name for error
         * @param {boolean} required - Whether name is required
         */
        validateCalendarName(name, field = "name", required = true) {
            if (required && utils.isEmpty(name)) {
                throw new ValidationError({
                    [field]: "Calendar name is required",
                });
            }
            if (name !== undefined && (typeof name !== "string" || utils.isEmpty(name))) {
                throw new ValidationError({
                    [field]: "Calendar name must be a non-empty string",
                });
            }
        },

        /**
         * Validate calendar URL
         * @param {string} url - URL to validate
         * @param {string} field - Field name for error
         * @param {boolean} required - Whether URL is required
         */
        validateCalendarUrl(url, field = "url", required = true) {
            if (required && utils.isEmpty(url)) {
                throw new ValidationError({
                    [field]: "Calendar URL is required",
                });
            }
            if (url !== undefined && !this.isValidCalendarUrl(url)) {
                throw new ValidationError({
                    [field]:
                        "Invalid calendar URL format. Supported protocols: http://, https://, webcal://",
                });
            }
        },

        /**
         * Validate boolean field (accepts boolean or 0/1)
         * @param {any} value - Value to validate
         * @param {string} field - Field name
         */
        validateBoolean(value, field) {
            if (value !== undefined && typeof value !== "boolean" && value !== 0 && value !== 1) {
                throw new ValidationError({
                    [field]: `${field} must be a boolean value or 0/1`,
                });
            }
        },

        /**
         * Validate complete calendar data for creation
         * @param {Object} data - Calendar data
         */
        validateCalendarCreate(data) {
            this.validateBody(data);

            const { name, url, color } = data;

            this.validateCalendarName(name, "name", true);
            this.validateCalendarUrl(url, "url", true);
            this.validateColor(color, "color");
        },

        /**
         * Validate complete calendar data for creation (batch validation)
         * @param {Object} data - Calendar data
         * @throws {ValidationError} When validation fails
         */
        validateCalendarCreateBatch(data) {
            const errors = {};

            try {
                this.validateBody(data);
            } catch (error) {
                errors.body = error.message;
                throw new ValidationError(errors);
            }

            const { name, url, color } = data;

            try {
                this.validateCalendarName(name, "name", true);
            } catch (error) {
                errors.name = error.message;
            }

            try {
                this.validateCalendarUrl(url, "url", true);
            } catch (error) {
                errors.url = error.message;
            }

            try {
                this.validateColor(color, "color");
            } catch (error) {
                errors.color = error.message;
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError(errors);
            }
        },

        /**
         * Validate calendar data for updates (partial)
         * @param {Object} data - Update data
         */
        validateCalendarUpdate(data) {
            this.validateBody(data);

            const { name, url, color, hidden, details } = data;

            if (name !== undefined) {
                this.validateCalendarName(name, "name", false);
            }

            if (url !== undefined) {
                this.validateCalendarUrl(url, "url", false);
            }

            if (color !== undefined && color !== null) {
                this.validateColor(color, "color");
            }

            if (hidden !== undefined) {
                this.validateBoolean(hidden, "hidden");
            }

            if (details !== undefined) {
                this.validateBoolean(details, "details");
            }
        },

        /**
         * Validate URL format for business logic (user input validation)
         * @param {string} value - The URL string to validate
         * @param {string} [field="url"] - Field name for error messages
         * @throws {ValidationError} If URL is invalid
         */
        validateUrl(value, field = "url") {
            if (typeof value !== "string") {
                throw new ValidationError({
                    [field]: "URL must be a string",
                });
            }

            try {
                new URL(value);
            } catch {
                throw new ValidationError({
                    [field]: "Must be a valid URL format",
                });
            }
        },

        /**
         * Validate email format for business logic (user input validation)
         * @param {string} value - The email string to validate
         * @param {string} [field="email"] - Field name for error messages
         * @throws {ValidationError} If email is invalid
         */
        validateEmail(value, field = "email") {
            if (typeof value !== "string") {
                throw new ValidationError({
                    [field]: "Email must be a string",
                });
            }

            if (!emailRegex.test(value)) {
                throw new ValidationError({
                    [field]: "Must be a valid email address",
                });
            }
        },

        /**
         * Validate hex color format (helper function)
         * @param {string} color - Color string to validate
         * @returns {boolean}
         */
        validateHexColor(color) {
            if (!color || typeof color !== "string") return false;
            return hexColorRegex.test(color);
        },

        /**
         * Check if URL is a valid iCal/WebCal URL (helper function)
         * @param {string} url
         * @returns {boolean}
         */
        isValidCalendarUrl(url) {
            try {
                new URL(url);
                const urlObj = new URL(url);
                const validProtocols = ["http:", "https:", "webcal:"];
                return validProtocols.includes(urlObj.protocol);
            } catch {
                return false;
            }
        },
    };
}
