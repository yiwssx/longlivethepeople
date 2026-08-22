const express = require('express');
const config = require('../config/config');

const router = express.Router();

const sendFrontend = (req, res, next) => {
    res.sendFile(config.frontend.indexPath, (error) => {
        if (error) next(error);
    });
};

router.get('/', sendFrontend);
router.get('/memorial', sendFrontend);

// Backward compatibility for bookmarks/forms from the original archive. No
// session state is stored; the welcome screen is presentation, not access control.
router.post('/', (req, res) => res.redirect(303, '/memorial'));

module.exports = router;
