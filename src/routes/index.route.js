const express = require('express');

const router = express.Router();

router.get('/', (req, res) => res.render('welcome'));
router.get('/memorial', (req, res) => res.render('index'));

// Backward compatibility for bookmarks/forms from the original archive. No
// session state is stored; the welcome screen is presentation, not access control.
router.post('/', (req, res) => res.redirect(303, '/memorial'));

module.exports = router;
