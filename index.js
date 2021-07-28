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
const fs = require('fs');
const morgan = require('morgan');
const config = require('./config/config');
const Message = require('./models/message.model');
const User = require('./models/user.model');

const port = process.env.PORT || 3000;
const dbURI = config.dbURI || config.dbdevURI;
const dbOptions = config.dbOptions;
const CSP = config.CSP;

// // HTTP request logger middleware
// if (app.get('env') === 'production') {
//     // create a write stream (in append mode)
// const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
//     app.use(morgan('combined', { stream: accessLogStream }))
// } else {
//     app.use(morgan('dev'));
// }

// set security HTTP headers
app.use(helmet());
app.use(helmet(CSP));

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

let needdoc = 0; //document to show for reduce webloading

app.get('/messages', async (req, res) => {
    try {
        let countdoc = await Message.countDocuments({});
        if (countdoc >= 100 ) {
            needdoc = countdoc - 50;
        }
        let data = await Message.find().skip(needdoc);
        res.status(200).send(data);
    } catch (err) {
        console.log(err);
    }
});

app.post('/messages', async (req, res) => {
    try {
        if (req.body.codename === '' && req.body.message === '') {
            let blank = { codename: "N/A", affiliation: "N/A", message: "N/A" }
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

async function userCounter(userIpaddr) {
    try {
        let result = await User.find({ipaddr : userIpaddr});
        if (result.length === 0) {
            let user = new User({ipaddr: userIpaddr});
            await user.save();
        } 
    } catch (err) {
        console.log(err);
    } 
}

io.on('connection', (socket) => {
    let userIpaddr = socket.handshake.address;
    userCounter(userIpaddr);
    // console.log('a user connected');
    socket.on('disconnect', () => {
        // console.log('user disconnected');
    });
});

mongoose.connect(dbURI, dbOptions)
    .then(() => {
        // console.log('MongoDB connected!!');
    }).catch(err => {
        console.log(err);;
    });

// server.listen(port, () => {
//     console.log(`listening on localhost:${port}`);
// });

server.listen(port);