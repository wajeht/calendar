export class ValidationError extends Error {
    constructor(messageOrErrors, field = null) {
        // Handle both single field error and multiple errors object
        if (typeof messageOrErrors === 'string') {
            // Single field error: new ValidationError('Name required', 'name')
            super(messageOrErrors);
            this.field = field;
            this.errors = field ? { [field]: messageOrErrors } : {};
        } else {
            // Multiple errors: new ValidationError({ name: 'Name required', url: 'Invalid URL' })
            const errors = messageOrErrors || {};
            const errorMessages = Object.values(errors);
            super(errorMessages.length > 0 ? errorMessages[0] : 'Validation failed');
            this.field = null;
            this.errors = errors;
        }

        this.name = 'ValidationError';
        this.statusCode = 400;
    }

    addError(field, message) {
        this.errors[field] = message;
    }

    hasErrors() {
        return Object.keys(this.errors).length > 0;
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
