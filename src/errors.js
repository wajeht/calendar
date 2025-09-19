export class ValidationError extends Error {
    constructor(errors = {}) {
        const errorMessages = Object.values(errors);
        super(errorMessages.length > 0 ? errorMessages[0] : 'Validation failed');
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.errors = errors;
    }
}

export class NotFoundError extends Error {
    constructor(resource = 'Resource') {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

export class CalendarFetchError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'CalendarFetchError';
        this.statusCode = 502;
        this.context = context;
    }
}

export class DatabaseError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = 500;
        this.originalError = originalError;
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Access token required') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
    }
}
