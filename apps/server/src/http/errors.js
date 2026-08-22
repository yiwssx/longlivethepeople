const { sendApiError } = require('./response');

class AppError extends Error {
    constructor(status, code, message, options = {}) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        this.expose = options.expose !== false;
    }
}

class DatabaseUnavailableError extends AppError {
    constructor() {
        super(503, 'DATABASE_UNAVAILABLE', 'Database is temporarily unavailable');
    }
}

class ValidationAppError extends AppError {
    constructor(message = 'Request data is invalid') {
        super(400, 'VALIDATION_ERROR', message);
    }
}

const normalizeParserError = (error, current) => {
    if (error.type === 'entity.too.large') {
        return {
            ...current,
            status: 413,
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request body is too large',
        };
    }

    if (error.type === 'entity.parse.failed') {
        return {
            ...current,
            status: 400,
            code: 'MALFORMED_JSON',
            message: 'Request body contains malformed JSON',
        };
    }

    return current;
};

const handleApiError = (error, req, res, {
    event = 'api_error',
    normalizeBodyParser = false,
} = {}) => {
    let details = {
        status: error.status || 500,
        code: error.code || 'INTERNAL_ERROR',
        message: error.expose === false ? undefined : error.message,
    };

    if (normalizeBodyParser) {
        details = normalizeParserError(error, details);
    }

    if (details.status >= 500) {
        console.error(JSON.stringify({
            level: 'error',
            event,
            requestId: req.id,
            code: details.code,
            message: error.message,
        }));
    }

    return sendApiError(res, {
        ...details,
        requestId: req.id,
    });
};

module.exports = {
    AppError,
    DatabaseUnavailableError,
    ValidationAppError,
    handleApiError,
};
