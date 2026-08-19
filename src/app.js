const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const favicon = require('serve-favicon');
const helmet = require('helmet');

const config = require('./config/config');
const { sendApiError } = require('./http/api-response');
const { requestContext } = require('./middleware/request-context');
const healthRoutes = require('./routes/health.route');
const indexRoutes = require('./routes/index.route');
const messageRoutes = require('./routes/message.route');

const app = express();
const isProduction = config.env === 'production';

app.set('trust proxy', config.trustProxy);
app.use(requestContext);
app.use(helmet(config.cspRule));

if (isProduction) {
    app.use(compression());
}

if (config.cors.origins.length > 0) {
    app.use(cors({ origin: config.cors.origins }));
}

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));
app.use(express.static(path.resolve(__dirname, '../public'), { index: false }));
app.use(favicon(path.resolve(__dirname, '../public/assets/img/favicon.ico')));

// Health endpoints do not depend on request-body parsing or application state.
app.use(healthRoutes);

// Web routes are intentionally stateless. The original session gate was only a
// splash-screen acknowledgement and was not an authorization boundary.
app.use('/', indexRoutes);

// API routes own their request parsing and validation so HTML/form traffic does
// not get a global parser or sanitizer applied to it.
app.use('/api/v1', messageRoutes);

// Keep API semantics machine-readable instead of redirecting unknown API paths
// back to the HTML landing page.
app.use('/api', (req, res) => sendApiError(res, {
    status: 404,
    code: 'API_NOT_FOUND',
    message: 'API resource not found',
    requestId: req.id,
}));

// Preserve the archive's historical web behavior for unknown browser routes.
app.use((req, res) => res.redirect(302, '/'));

app.use((err, req, res, next) => {
    if ((err.status || 500) >= 500) {
        console.error(JSON.stringify({
            level: 'error',
            event: 'unhandled_error',
            requestId: req.id,
            message: err.message,
            stack: config.env === 'development' ? err.stack : undefined,
        }));
    }

    if (req.originalUrl.startsWith('/api/')) {
        const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
        const code = err.code
            || (status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR');
        const message = err.expose === false
            ? undefined
            : err.message;

        return sendApiError(res, {
            status,
            code,
            message,
            requestId: req.id,
        });
    }

    return res.sendStatus(err.status || 500);
});

module.exports = app;
