const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');

router.use('/auth', authRoute);

module.exports = router;