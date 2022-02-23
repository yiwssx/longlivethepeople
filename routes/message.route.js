const express = require('express');
const router = express.Router();
const controllers = require('../controllers/message.controller');

router.get('/messages', async (req, res) => {
    try {
        let result = await controllers.getMessage();
        res.send(result);
    } catch(error) {
        console.log(error.message);
    }
});

router.post('/messages', async (req, res) => {
    try {
        await controllers.postMessage(req);
    } catch(error) {
        console.log(error.message);
    }
});

module.exports = router;