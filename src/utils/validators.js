export function createValidators(dependencies = {}) {
    const { errors, utils } = dependencies;

    if (!errors) throw new Error('Errors required for validators');
    if (!utils) throw new Error('Utils required for validators');

    const { ValidationError } = errors;

    return {
        /**
         * Validate and parse ID, throwing ValidationError on failure
         * @param {string} idStr - ID string to validate
         * @returns {number} Parsed ID
         */
        validateId(idStr) {
            const id = utils.parseId(idStr);
            if (id === null) {
                throw new ValidationError('Invalid ID');
            }
            return id;
        },

        /**
         * Validate request body, throwing ValidationError on failure
         * @param {any} body - Request body
         * @returns {Object} Validated body
         */
        validateBody(body) {
            if (!body || typeof body !== 'object' || Array.isArray(body)) {
                throw new ValidationError('Request body must be a valid JSON object');
            }
            return body;
        },

        /**
         * Validate hex color, throwing ValidationError on failure
         * @param {string} color - Color to validate
         * @param {string} field - Field name for error
         */
        validateColor(color, field = 'color') {
            if (color && !utils.validateHexColor(color)) {
                throw new ValidationError('Color must be a valid hex color (e.g., #447dfc)', field);
            }
        },

        /**
         * Validate calendar name
         * @param {string} name - Name to validate
         * @param {string} field - Field name for error
         * @param {boolean} required - Whether name is required
         */
        validateCalendarName(name, field = 'name', required = true) {
            if (required && utils.isEmpty(name)) {
                throw new ValidationError('Calendar name is required', field);
            }
            if (name !== undefined && (typeof name !== 'string' || utils.isEmpty(name))) {
                throw new ValidationError('Calendar name must be a non-empty string', field);
            }
        },

        /**
         * Validate calendar URL
         * @param {string} url - URL to validate
         * @param {string} field - Field name for error
         * @param {boolean} required - Whether URL is required
         */
        validateCalendarUrl(url, field = 'url', required = true) {
            if (required && utils.isEmpty(url)) {
                throw new ValidationError('Calendar URL is required', field);
            }
            if (url !== undefined && !utils.validateCalendarUrl(url)) {
                throw new ValidationError('Invalid calendar URL format', field);
            }
        },

        /**
         * Validate boolean field
         * @param {any} value - Value to validate
         * @param {string} field - Field name
         */
        validateBoolean(value, field) {
            if (value !== undefined && typeof value !== 'boolean') {
                throw new ValidationError(`${field} must be a boolean value`, field);
            }
        },

        /**
         * Validate complete calendar data for creation
         * @param {Object} data - Calendar data
         */
        validateCalendarCreate(data) {
            this.validateBody(data);

            const { name, url, color } = data;

            this.validateCalendarName(name, 'name', true);
            this.validateCalendarUrl(url, 'url', true);
            this.validateColor(color, 'color');
        },

        /**
         * Validate complete calendar data for creation (batch validation)
         * @param {Object} data - Calendar data
         * @throws {ValidationError} When validation fails
         */
        validateCalendarCreateBatch(data) {
            const validationErrors = new ValidationError({});

            try {
                this.validateBody(data);
            } catch (error) {
                validationErrors.addError('body', error.message);
                throw validationErrors;
            }

            const { name, url, color } = data;

            try {
                this.validateCalendarName(name, 'name', true);
            } catch (error) {
                validationErrors.addError('name', error.message);
            }

            try {
                this.validateCalendarUrl(url, 'url', true);
            } catch (error) {
                validationErrors.addError('url', error.message);
            }

            try {
                this.validateColor(color, 'color');
            } catch (error) {
                validationErrors.addError('color', error.message);
            }

            if (validationErrors.hasErrors()) {
                throw validationErrors;
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
                this.validateCalendarName(name, 'name', false);
            }

            if (url !== undefined) {
                this.validateCalendarUrl(url, 'url', false);
            }

            if (color !== undefined && color !== null) {
                this.validateColor(color, 'color');
            }

            if (hidden !== undefined) {
                this.validateBoolean(hidden, 'hidden');
            }

            if (details !== undefined) {
                this.validateBoolean(details, 'details');
            }
        }
    };
}
