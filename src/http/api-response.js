const DEFAULT_MESSAGES = {
    400: 'Request data is invalid',
    404: 'Resource not found',
    413: 'Request body is too large',
    415: 'Content type is not supported',
    429: 'Too many requests',
    500: 'Internal server error',
    503: 'Service temporarily unavailable',
};

const sendApiError = (res, {
    status = 500,
    code = 'INTERNAL_ERROR',
    message,
    requestId,
} = {}) => res.status(status).json({
    error: {
        code,
        message: message || DEFAULT_MESSAGES[status] || DEFAULT_MESSAGES[500],
        requestId: requestId || res.req?.id || null,
    },
});

module.exports = { sendApiError };
