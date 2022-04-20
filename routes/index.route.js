const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    let session = req.session;
    if (session.people) {
        res.render('index');
    } else {
        res.render('welcome');
    }
});

router.post('/', (req, res) => {
    let session = '';
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