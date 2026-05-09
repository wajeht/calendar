import bcrypt from "bcryptjs";
import crypto from "crypto";
import { accepts } from "hono/accepts";
import { getCookie } from "hono/cookie";

function getRequestPath(c) {
    return c.req.path;
}

function getRequestHeader(c, name) {
    return c.req.header(name);
}

export function createUtils(dependencies = {}) {
    const { logger, config, errors } = dependencies;

    if (!errors) throw new Error("Errors required for utils");
    const { ConfigurationError, ValidationError } = errors;

    if (!logger) throw new ConfigurationError("Logger required for utils");
    if (!config) throw new ConfigurationError("Config required for utils");

    return {
        /**
         * Check if a request is an API request
         * @param {Object} c - Hono context
         * @returns {boolean}
         */
        isApiRequest(c) {
            const path = getRequestPath(c);

            if (path.startsWith("/api/")) {
                return true;
            }

            const accept = accepts(c, {
                header: "Accept",
                supports: ["application/json", "text/html"],
                default: "text/html",
            });
            if (accept === "application/json") {
                return true;
            }

            const contentType = getRequestHeader(c, "Content-Type") || "";
            if (contentType.includes("application/json")) {
                return true;
            }

            if (getRequestHeader(c, "X-Requested-With") === "XMLHttpRequest") {
                return true;
            }

            return false;
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
            if (typeof str !== "string") return "";
            return str.trim().replace(/<[^>]*>/g, ""); // Remove HTML tags
        },

        /**
         * Generate a random hex color
         * @returns {string}
         */
        generateRandomColor() {
            const colors = [
                "#447dfc",
                "#e74c3c",
                "#2ecc71",
                "#f39c12",
                "#9b59b6",
                "#1abc9c",
                "#34495e",
                "#e67e22",
                "#95a5a6",
                "#16a085",
                "#27ae60",
                "#2980b9",
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        },

        /**
         * Sleep/delay function for async operations
         * @param {number} ms - Milliseconds to sleep
         * @returns {Promise}
         */
        sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
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
            if (typeof value === "string") return value.trim() === "";
            if (Array.isArray(value)) return value.length === 0;
            if (typeof value === "object") return Object.keys(value).length === 0;
            return false;
        },

        /**
         * Parse and check if an ID string is a valid positive integer
         * @param {string} idStr - The ID string to parse
         * @returns {number|null} Parsed ID or null if invalid
         */
        parseId(idStr) {
            const id = parseInt(idStr);
            if (isNaN(id) || id <= 0) {
                return null;
            }
            return id;
        },

        /**
         * Validate session token with idle and absolute timeouts
         * @param {string} token - Session token to validate
         * @param {number} [lastActivity] - Last activity timestamp for idle check
         * @returns {boolean} - True if token is valid and not expired
         */
        validateSessionToken(token, lastActivity = null) {
            if (!token || typeof token !== "string") {
                return false;
            }

            try {
                const [timestamp] = token.split(".");
                const tokenCreatedAt = parseInt(timestamp);

                if (isNaN(tokenCreatedAt)) {
                    return false;
                }

                const now = Date.now();

                // Absolute timeout - max session lifetime from creation
                if (now - tokenCreatedAt > config.auth.absoluteTimeout) {
                    return false;
                }

                // Idle timeout - max time since last activity
                if (lastActivity) {
                    const lastActivityTime = parseInt(lastActivity);
                    if (
                        !isNaN(lastActivityTime) &&
                        now - lastActivityTime > config.auth.idleTimeout
                    ) {
                        return false;
                    }
                }

                return true;
            } catch {
                return false;
            }
        },

        cwd() {
            return process.cwd();
        },

        /**
         * Check if request is authenticated via session token
         * @param {Object} c - Hono context
         * @returns {boolean} - True if request is authenticated
         */
        isAuthenticated(c) {
            const token = getCookie(c, "session_token") || null;
            const lastActivity = getCookie(c, "session_activity") || null;
            return this.validateSessionToken(token, lastActivity);
        },

        /**
         * Hash a password using bcrypt
         * @param {string} password - Plain text password to hash
         * @returns {Promise<string>} - Hashed password
         */
        async hashPassword(password) {
            if (!password || typeof password !== "string") {
                throw new ValidationError({ password: "Password must be a non-empty string" });
            }

            if (bcrypt.truncates(password)) {
                throw new ValidationError({
                    password: "Password is too long (maximum 72 bytes when UTF-8 encoded)",
                });
            }

            const saltRounds = config.app.env === "test" ? 1 : 12;
            try {
                return await bcrypt.hash(password, saltRounds);
            } catch (error) {
                logger.error("password hashing error", { error: error.message });
                throw new ConfigurationError("Failed to hash password", { cause: error });
            }
        },

        /**
         * Verify a password against a hash
         * @param {string} password - Plain text password to verify
         * @param {string} hash - Hashed password to compare against
         * @returns {Promise<boolean>} - True if password matches hash
         */
        async verifyPassword(password, hash) {
            if (!password || typeof password !== "string") {
                return false;
            }

            if (!hash || typeof hash !== "string") {
                return false;
            }

            try {
                return await bcrypt.compare(password, hash);
            } catch (error) {
                logger.error("password verification error", { error: error.message });
                return false;
            }
        },

        /**
         * Normalize calendar URL by converting webcal:// to https://
         * @param {string} url - The URL to normalize
         * @returns {string} - The normalized URL
         */
        normalizeCalendarUrl(url) {
            if (typeof url !== "string") {
                return url;
            }

            return url.replace(/^webcal:\/\//, "https://");
        },

        /**
         * Generate a cryptographically secure random token
         * @param {number} bytes - Number of bytes (default 32, produces 64 hex chars)
         * @returns {string} - Hex-encoded random token
         */
        generateSecureToken(bytes = 32) {
            return crypto.randomBytes(bytes).toString("hex");
        },
    };
}
