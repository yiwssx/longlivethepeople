module.exports = {
    MONGODB_URI: 'mongodb://localhost:27017/test' || process.env.MONGODB_URI,
    MONGODB_Options: {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        // useCreateIndex: true,
        // useFindAndModify: false
    },
    CSP_RULE: {
        contentSecurityPolicy: {
            directives: {
                connectSrc: ["'self'"],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
                imgSrc: ["'self'"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
                styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
                frameSrc: ["'self'"],
                mediaSrc: ["'self'"],

            }
        }
    }
}