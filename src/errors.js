import { HTTPException } from "hono/http-exception";

export class ValidationError extends HTTPException {
    constructor(errors = {}, options = {}) {
        const normalizedErrors = Object.fromEntries(
            Object.entries(errors).filter(([, message]) => message),
        );
        const errorMessages = Object.values(normalizedErrors);
        const message = errorMessages.length > 0 ? errorMessages[0] : "Validation failed";
        super(400, { ...options, message });
        this.name = "ValidationError";
        this.errors = normalizedErrors;
    }
}

export class NotFoundError extends HTTPException {
    constructor(resource = "Resource", options = {}) {
        super(404, { ...options, message: `${resource} not found` });
        this.name = "NotFoundError";
    }
}

export class CalendarFetchError extends HTTPException {
    constructor(message, context = {}, options = {}) {
        super(502, { ...options, message });
        this.name = "CalendarFetchError";
        this.context = context;
    }
}

export class DatabaseError extends HTTPException {
    constructor(message, originalError = null, options = {}) {
        super(500, { ...options, message, cause: options.cause ?? originalError ?? undefined });
        this.name = "DatabaseError";
        this.originalError = originalError;
    }
}

export class AuthenticationError extends HTTPException {
    constructor(message = "Access token required", options = {}) {
        super(401, { ...options, message });
        this.name = "AuthenticationError";
    }
}

export class ConfigurationError extends HTTPException {
    constructor(message, options = {}) {
        super(500, { ...options, message });
        this.name = "ConfigurationError";
    }
}

export class TimeoutError extends HTTPException {
    constructor(message, timeout = null, options = {}) {
        super(408, { ...options, message });
        this.name = "TimeoutError";
        this.timeout = timeout;
    }
}

export class ICalParseError extends HTTPException {
    constructor(message, originalError = null, options = {}) {
        super(422, { ...options, message, cause: options.cause ?? originalError ?? undefined });
        this.name = "ICalParseError";
        this.originalError = originalError;
    }
}
