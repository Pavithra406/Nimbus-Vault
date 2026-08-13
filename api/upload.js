const { getPool } = require('./_lib/db');
const { verifyToken } = require('./_lib/auth');
const { encryptBuffer } = require('./_lib/encryption');
const { uploadToAllClouds } = require('./_lib/cloud');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

module.exports.config = { api: { bodyParser: false } };

const runMiddleware = (req, res, fn) => new Promise((resolve, reject) => fn(req, res, (result) => result instanceof Error ? reject(result) : resolve(result)));

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        await runMiddleware(req, res, upload.single('file'));

        if (!req.file) return res.status(400).json({ message: 'Please upload a file!' });

        const { originalname, mimetype, size, buffer } = req.file;
        const uniqueFilename = `${userId}-${Date.now()}-${originalname.replace(/\s+/g, '_')}`;

        const encryptedBuffer = encryptBuffer(buffer);
        const cloudUrls = await uploadToAllClouds(uniqueFilename, encryptedBuffer, mimetype);

        const pool = getPool();
        let newFile;

        if (cloudUrls.useDbFallback) {
            // Store encrypted file data in the database
            const { rows } = await pool.query(
                'INSERT INTO Files (user_id, filename, file_size, aws_url, gcp_url, firebase_url, file_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                [userId, originalname, size, null, null, null, cloudUrls.buffer]
            );
            newFile = rows[0];
        } else {
            const { rows } = await pool.query(
                'INSERT INTO Files (user_id, filename, file_size, aws_url, gcp_url, firebase_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [userId, originalname, size, cloudUrls.aws_url, cloudUrls.gcp_url, cloudUrls.firebase_url]
            );
            newFile = rows[0];
        }

        const targets = cloudUrls.useDbFallback
            ? ['database']
            : [cloudUrls.aws_url, cloudUrls.gcp_url, cloudUrls.firebase_url].filter(Boolean);

        await pool.query(
            'INSERT INTO ActivityLogs (user_id, action, file_id, filename, details) VALUES ($1, $2, $3, $4, $5)',
            [userId, 'upload', newFile.id, originalname, `Stored in ${targets.length} target(s): ${targets.join(', ')}`]
        );

        res.status(200).json({
            message: 'File uploaded successfully!',
            fileId: newFile.id,
            urls: cloudUrls.useDbFallback ? { storage: 'database' } : {
                aws_url: cloudUrls.aws_url,
                gcp_url: cloudUrls.gcp_url,
                firebase_url: cloudUrls.firebase_url
            }
        });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ message: err.message });
    }
};
