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
         * Simple session authentication utilities
         */
        auth: {
            /**
             * Generate a simple session token
             * @returns {string}
             */
            generateSessionToken() {
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2);
                return `${timestamp}.${random}`;
            },

            /**
             * Validate session token (just check if it exists and isn't expired)
             * @param {string} token - Session token
             * @returns {boolean}
             */
            validateSessionToken(token) {
                if (!token) return false;

                try {
                    const [timestamp] = token.split('.');
                    const tokenTime = parseInt(timestamp);
                    const now = Date.now();
                    const twentyFourHours = 24 * 60 * 60 * 1000;

                    return (now - tokenTime) < twentyFourHours;
                } catch (error) {
                    return false;
                }
            },

            /**
             * Extract session token from request cookies
             * @param {Object} req - Express request object
             * @returns {string|null}
             */
            extractSessionToken(req) {
                return req.cookies?.session_token || null;
            },

            /**
             * Validate password against stored app password
             * @param {string} password - Password to validate
             * @returns {boolean}
             */
            validatePassword(password) {
                return password === config.auth.password;
            },

        }

    };
}
