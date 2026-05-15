const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/', verifyToken, upload.single('file'), fileController.uploadFile);
router.get('/', verifyToken, fileController.listFiles);
router.post('/upload', verifyToken, upload.single('file'), fileController.uploadFile);
router.get('/list', verifyToken, fileController.listFiles);
router.get('/download/:id', verifyToken, fileController.downloadFile);
router.delete('/delete/:id', verifyToken, fileController.deleteFile);

module.exports = router;
