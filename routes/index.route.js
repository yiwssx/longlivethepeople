const express = require('express');
const router = express.Router();

let session;

router.get('/', function (req, res) {
    session = req.session;
    if (session.people) {
        res.render('index');
    } else {
        res.render('welcome');
    }
});

router.post('/', function (req, res) {
    if (req.body.people === 'thepeople') {
        session = req.session;
        session.people = req.body.people;
        res.render('index');
    } else {
        session = req.session;
        session.people = 'thepeople';
        res.render('index');
    }   
});

module.exports = router;