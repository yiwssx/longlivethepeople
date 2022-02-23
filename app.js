const express = require('express');
const app = express();
const createError = require('http-errors');
const compression = require('compression');
const sessions = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const favicon = require('serve-favicon');
const helmet = require('helmet');
const logger = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const minify = require('express-minify');
const path = require('path');
const mongoService = require('./services/mongod.service');
const xss = require('xss-clean');
const indexRoutes = require('./routes/index.route');
const messageRoutes = require('./routes/message.route');
const config = require('./config/config');
const CSP_RULE = config.CSP_RULE;
const MONGODB_URI = config.MONGODB_URI;
const MONGODB_Options = config.MONGODB_Options;

// HTTP request logger middleware
if (process.env.NODE_ENV !== 'production') {
    app.use(logger('dev'));
} else {
    app.use(logger('combined'));
}

// set security HTTP headers
app.use(helmet(CSP_RULE));

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// app sessions
app.use(sessions({
    secret: "longlivethepeople",
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 6 }, //six hours
    resave: false
}));

// use cookie
app.use(cookieParser());

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// minify assets
app.use(minify());

// enable cors
app.use(cors());
app.options('*', cors());

// connect to mongodb database
mongoService(MONGODB_URI, MONGODB_Options)
    .catch(error => console.error(error));

// define app routes
app.use('/', indexRoutes);
app.use('/api/v1', messageRoutes);

// serve static content
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'), {index: false}));
app.use(favicon(path.join(__dirname, 'public/assets/img/favicon.ico')));

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    // res.render('error');
});

module.exports = app;