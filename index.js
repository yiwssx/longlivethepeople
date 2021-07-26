const express = require('express');
const app = express();
const http = require('http');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');
const path = require('path');
const Message = require('./models/message.model');

const PORT = process.env.PORT || 3000;
const dbdevUri = 'mongodb://localhost:27017/test';
const dbUrl = process.env.MONGODB_URI || dbdevUri;
const dbOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
};

// set security HTTP headers
app.use(helmet());
app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"], 
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"]
        }
      }
    })
  );

// parse json request body
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options('*', cors());

app.get('/', function (req, res) {
    res.sendFile('/public/index.html', { root: __dirname });
});

app.get('/home', function (req, res) {
    res.sendFile('/public/home.html', { root: __dirname });
});

app.get('/messages', async (req, res) => {
    try {
        let data = await Message.find({});
        res.status(200).send(data);
    } catch (err) {
        console.log(err);
    }
});

app.post('/messages', async (req, res) => {
    try {
        if (req.body.name === '' && req.body.message === '') {
            let blank = {name:"N/A",message:"N/A"} 
            let data = new Message(blank);
            await data.save();
            io.emit('message', blank);
            res.sendStatus(201);
        } else {
            let data = new Message(req.body);
            await data.save();
            io.emit('message', req.body);
            res.sendStatus(201);
        } 
    }
    catch (err) {
        console.log(err);
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

mongoose.connect(dbUrl, dbOptions)
    .then(() => {
        console.log('MongoDB connected!!');
    }).catch(err => {
        console.log(err);;
    });

server.listen(PORT, () => {
    console.log(`listening on localhost:${PORT}`);
});