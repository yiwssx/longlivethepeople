const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    const session = req.session;
    if (session.people) {
        return res.render('index');
    }

    return res.render('welcome');
});

router.post('/', (req, res) => {
    const session = req.session;
    session.people = req.body.people === 'thepeople' ? req.body.people : 'thepeople';
    return res.render('index');
});

module.exports = router;
