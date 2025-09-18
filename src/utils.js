export function createUtils(dependencies = {}) {
    const { logger, config } = dependencies;

    if (!logger) throw new Error('Logger required for utils');
    if (!config) throw new Error('Config required for utils');

    return {
        /**
         * Check if a request is an API request
         * @param {Object} req - Express request object
         * @returns {boolean}
         */
        isApiRequest(req) {
            if (req.path.startsWith('/api/')) {
                return true;
            }

            const acceptHeader = req.get('Accept') || '';
            if (acceptHeader.includes('application/json')) {
                return true;
            }

            const contentType = req.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                return true;
            }

            if (req.xhr) {
                return true;
            }

            if (req.get('X-Requested-With') === 'XMLHttpRequest') {
                return true;
            }

            return false;
        },

        /**
         * Validate email format
         * @param {string} email
         * @returns {boolean}
         */
        validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        /**
         * Validate URL format
         * @param {string} url
         * @returns {boolean}
         */
        validateUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Validate iCal/WebCal URL
         * @param {string} url
         * @returns {boolean}
         */
        validateCalendarUrl(url) {
            if (!this.validateUrl(url)) return false;

            const validProtocols = ['http:', 'https:', 'webcal:'];
            const urlObj = new URL(url);

            return validProtocols.includes(urlObj.protocol);
        },

        /**
         * Format date to ISO string
         * @param {Date|string} date
         * @returns {string}
         */
        formatDate(date) {
            return new Date(date).toISOString();
        },

        /**
         * Sanitize string for safe display
         * @param {string} str
         * @returns {string}
         */
        sanitizeString(str) {
            if (typeof str !== 'string') return '';
            return str.trim().replace(/<[^>]*>/g, ''); // Remove HTML tags
        },

        /**
         * Generate a random hex color
         * @returns {string}
         */
        generateRandomColor() {
            const colors = [
                '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
                '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
                '#95a5a6', '#16a085', '#27ae60', '#2980b9'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        },

        /**
         * Sleep/delay function for async operations
         * @param {number} ms - Milliseconds to sleep
         * @returns {Promise}
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Deep clone an object
         * @param {Object} obj
         * @returns {Object}
         */
        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Check if value is empty (null, undefined, empty string, empty array, empty object)
         * @param {any} value
         * @returns {boolean}
         */
        isEmpty(value) {
            if (value == null) return true;
            if (typeof value === 'string') return value.trim() === '';
            if (Array.isArray(value)) return value.length === 0;
            if (typeof value === 'object') return Object.keys(value).length === 0;
            return false;
        },

        /**
         * Validate and parse a numeric ID from request parameters
         * @param {string} idStr - The ID string from req.params
         * @returns {number} Parsed ID
         * @throws {Error} If ID is invalid
         */
        validateId(idStr) {
            const id = parseInt(idStr);
            if (isNaN(id) || id <= 0) {
                throw new Error('Invalid ID');
            }
            return id;
        },


        /**
         * Validate hex color format
         * @param {string} color - Color string to validate
         * @returns {boolean}
         */
        validateHexColor(color) {
            if (!color || typeof color !== 'string') return false;
            return /^#[0-9A-Fa-f]{6}$/.test(color);
        },



    };
}
