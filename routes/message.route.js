const express = require('express');
const router = express.Router();
const controllers = require('../controllers/message.controller');

router.get('/messages', async (req, res) => {
    try {
        let result = await controllers.getMessage();
        if(result.length === 0) {
            return res.sendStatus(204);
        } else {
            return res.status(200).json(result);
        }
        
    } catch(error) {
        console.log(error.message);
    }
});

router.post('/messages', async (req, res) => {
    try {
        let codename = req.body.codename;
        let affiliation = req.body.affiliation;
        let message = req.body.codename;
        if (codename.length === 0 || affiliation.length === 0 || message.length === 0) {
            return res.sendStatus(400);
        } else {
            return await controllers.postMessage(req, res);
        }
    } catch(error) {
        console.log(error.message);
    }
});

module.exports = router;