const express = require('express');
const router = express.Router();
const { getInstanceInfo } = require('../controllers/instanceController');

router.get('/instance', getInstanceInfo);

module.exports = router;
