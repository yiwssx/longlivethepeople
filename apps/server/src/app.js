const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const favicon = require('serve-favicon');
const helmet = require('helmet');

const config = require('./config');
const { handleApiError } = require('./http/errors');
const { sendApiError } = require('./http/response');
const { requestContext } = require('./middleware/request-context');
const healthRoutes = require('./routes/health.routes');
const webRoutes = require('./routes/web.routes');
const messageRoutes = require('./modules/messages/message.routes');

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

app.use(express.static(config.frontend.distPath, { index: false }));
app.use(express.static(config.frontend.publicPath, { index: false }));
app.use(favicon(path.join(config.frontend.publicPath, 'assets/img/favicon.ico')));

// Health endpoints do not depend on request-body parsing or application state.
app.use(healthRoutes);

// Web routes serve the Vite-built React application and remain stateless.
app.use('/', webRoutes);

// Feature routes own their request parsing and validation.
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
    if (req.originalUrl.startsWith('/api/')) {
        return handleApiError(err, req, res, {
            event: 'unhandled_error',
            normalizeBodyParser: true,
        });
    }

    if ((err.status || 500) >= 500) {
        console.error(JSON.stringify({
            level: 'error',
            event: 'unhandled_error',
            requestId: req.id,
            message: err.message,
            stack: config.env === 'development' ? err.stack : undefined,
        }));
    }

    return res.sendStatus(err.status || 500);
});

module.exports = app;
