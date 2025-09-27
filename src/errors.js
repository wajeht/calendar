export class ValidationError extends Error {
    constructor(errors = {}, options = {}) {
        const errorMessages = Object.values(errors);
        super(errorMessages.length > 0 ? errorMessages[0] : "Validation failed", options);
        this.name = "ValidationError";
        this.statusCode = 400;
        this.errors = errors;
    }
}

export class NotFoundError extends Error {
    constructor(resource = "Resource", options = {}) {
        super(`${resource} not found`, options);
        this.name = "NotFoundError";
        this.statusCode = 404;
    }
}

export class CalendarFetchError extends Error {
    constructor(message, context = {}, options = {}) {
        super(message, options);
        this.name = "CalendarFetchError";
        this.statusCode = 502;
        this.context = context;
    }
}

export class DatabaseError extends Error {
    constructor(message, originalError = null, options = {}) {
        super(message, options);
        this.name = "DatabaseError";
        this.statusCode = 500;
        this.originalError = originalError;
    }
}

export class AuthenticationError extends Error {
    constructor(message = "Access token required", options = {}) {
        super(message, options);
        this.name = "AuthenticationError";
        this.statusCode = 401;
    }
}

export class ConfigurationError extends Error {
    constructor(message, options = {}) {
        super(message, options);
        this.name = "ConfigurationError";
        this.statusCode = 500;
    }
}

export class TimeoutError extends Error {
    constructor(message, timeout = null, options = {}) {
        super(message, options);
        this.name = "TimeoutError";
        this.statusCode = 408;
        this.timeout = timeout;
    }
}

export class ParseError extends Error {
    constructor(message, originalError = null, options = {}) {
        super(message, options);
        this.name = "ParseError";
        this.statusCode = 422;
        this.originalError = originalError;
    }
}

export class ICalParseError extends Error {
    constructor(message, originalError = null, options = {}) {
        super(message, options);
        this.name = "ICalParseError";
        this.statusCode = 422;
        this.originalError = originalError;
    }
}
