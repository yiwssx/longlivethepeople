module.exports = {
    dbdevURI: 'mongodb://localhost:27017/test',
    dbURI: process.env.MONGODB_URI,
    dbOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    },
    CSP: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
                objectSrc: ["'self'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'"]
            }
        }
    }
}