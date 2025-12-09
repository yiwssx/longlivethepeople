// Routes serving the static EJS pages for the application
const express = require('express');

const router = express.Router();

// Landing page gatekeeper that decides which view to render
router.get('/', (req, res) => {
    const session = req.session;
    if (session.people) {
        return res.render('index');
    }

    return res.render('welcome');
});

// Store the shared passphrase and send the user into the app shell
router.post('/', (req, res) => {
    const session = req.session;
    session.people = req.body.people === 'thepeople' ? req.body.people : 'thepeople';
    return res.render('index');
});

module.exports = router;
