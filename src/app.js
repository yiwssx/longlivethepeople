// Core Express setup and middleware dependencies for the application server.
const path = require('path');
const express = require('express');
const createError = require('http-errors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const favicon = require('serve-favicon');
const helmet = require('helmet');
const logger = require('morgan');
const minify = require('express-minify');
const sessions = require('express-session');
const { MongoStore } = require('connect-mongo');
const xss = require('xss');

const config = require('./config/config');
const databaseService = require('./services/database.service');
const indexRoutes = require('./routes/index.route');
const messageRoutes = require('./routes/message.route');

const app = express();
const isProduction = config.env === 'production';
const isTest = config.env === 'test';

app.set('trust proxy', config.trustProxy);

// Basic recursive sanitizer that works with Express 5's request objects.
const sanitizeInPlace = (value) => {
    if (!value || typeof value !== 'object') {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            if (typeof item === 'string') {
                value[index] = xss(item);
                return;
            }
            if (item && typeof item === 'object') {
                sanitizeInPlace(item);
            }
        });
        return;
    }

    Object.keys(value).forEach((key) => {
        if (key.startsWith('$') || key.includes('.')) {
            delete value[key];
            return;
        }

        const current = value[key];
        if (typeof current === 'string') {
            value[key] = xss(current);
            return;
        }
        if (current && typeof current === 'object') {
            sanitizeInPlace(current);
        }
    });
};

const sanitizeRequest = (req, res, next) => {
    sanitizeInPlace(req.body);
    sanitizeInPlace(req.query);
    sanitizeInPlace(req.params);
    next();
};

// Only log requests outside of test environments to keep output clean.
if (!isTest) {
    app.use(logger(isProduction ? 'combined' : 'dev'));
}

// Security-related middleware to harden the Express app.
app.use(helmet(config.cspRule));

// Performance tweaks enabled only in production builds.
if (isProduction) {
    app.use(compression());
    app.use(minify());
}

// Cross-origin access is opt-in. Same-origin browser traffic does not require CORS.
if (config.cors.origins.length > 0) {
    app.use(cors({ origin: config.cors.origins }));
}

// Configure the view engine and serve static assets before session storage.
// Static asset requests should not fail when the session database is unavailable.
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));
app.use(express.static(path.resolve(__dirname, '../public'), { index: false }));
app.use(favicon(path.resolve(__dirname, '../public/assets/img/favicon.ico')));

app.use(express.json({ limit: config.http.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.http.bodyLimit }));
app.use(cookieParser());

const sessionOptions = {
    secret: config.session.secret,
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: config.session.maxAgeMs,
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
    },
};

if (isProduction) {
    sessionOptions.store = MongoStore.create({
        mongoUrl: config.mongodb.uri,
        mongoOptions: config.mongodb.options,
    });
}

app.use(sessions(sessionOptions));
app.use(sanitizeRequest);

// Establish the MongoDB connection before handling database-backed requests.
// Static content remains available while database-backed endpoints report 503.
databaseService.connect(config.mongodb.uri, config.mongodb.options)
    .catch((error) => {
        if (!isTest) {
            console.error(error.message);
        }
    });

// Register route handlers for web pages and API endpoints.
app.use('/', indexRoutes);
app.use('/api/v1', messageRoutes);

// Convert unmatched routes to 404 errors for centralized handling.
app.use((req, res, next) => next(createError(404)));

// Centralized error handling with graceful fallbacks for common status codes.
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (err.status === 404) {
        return res.redirect('/');
    }

    if ((err.status || 500) >= 500) {
        console.error(err);
    }

    return res.sendStatus(err.status || 500);
});

module.exports = app;
