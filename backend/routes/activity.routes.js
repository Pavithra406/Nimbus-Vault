const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, activityController.getActivity);

module.exports = router;
