// API routes responsible for retrieving and posting encrypted messages
const express = require('express');

const controllers = require('../controllers/message.controller');

const router = express.Router();

// Retrieve messages in reverse chronological order
router.get('/messages', async (req, res) => {
    try {
        const result = await controllers.getMessage();

        if (result.length === 0) {
            return res.sendStatus(204);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(error.message);
        return res.sendStatus(500);
    }
});

// Validate and store new messages coming from clients
router.post('/messages', async (req, res) => {
    try {
        const { codename, affiliation, message } = req.body;
        if (![codename, affiliation, message].every((value) => typeof value === 'string' && value.trim())) {
            return res.sendStatus(400);
        }

        return controllers.postMessage(req, res);
    } catch (error) {
        console.error(error.message);
        return res.sendStatus(500);
    }
});

module.exports = router;
