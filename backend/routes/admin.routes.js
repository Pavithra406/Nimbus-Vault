const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');

router.get('/stats', verifyToken, requireAdmin, adminController.getStats);
router.get('/files', verifyToken, requireAdmin, adminController.getAllFiles);
router.get('/users', verifyToken, requireAdmin, adminController.getAllUsers);

module.exports = router;
