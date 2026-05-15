const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const adminRoutes = require('./routes/admin.routes');
const activityRoutes = require('./routes/activity.routes');
const { verifyToken } = require('./middleware/auth.middleware');
const { requireAdmin } = require('./middleware/admin.middleware');
const upload = require('./middleware/upload.middleware');
const fileController = require('./controllers/file.controller');
const adminController = require('./controllers/admin.controller');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activity', activityRoutes);
app.post('/api/upload', verifyToken, upload.single('file'), fileController.uploadFile);
app.get('/api/users', verifyToken, requireAdmin, adminController.getAllUsers);

app.get('/', (req, res) => {
    res.json({ message: "Welcome to Multi-Cloud Backup System API" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
