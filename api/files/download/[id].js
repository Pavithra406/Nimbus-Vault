const { getPool } = require('../../_lib/db');
const { verifyToken } = require('../../_lib/auth');
const { decryptBuffer } = require('../../_lib/encryption');
const { downloadWithFailover } = require('../../_lib/cloud');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const fileId = req.query.id;
        const pool = getPool();

        const { rows } = await pool.query('SELECT * FROM Files WHERE id = $1 AND user_id = $2', [fileId, userId]);
        if (!rows.length) return res.status(404).json({ message: 'File not found or unauthorized.' });

        const file = rows[0];
        const location = file.aws_url || file.gcp_url || file.firebase_url || null;

        // Pass file_data (DB fallback) and cloud location to downloadWithFailover
        const encryptedBuffer = await downloadWithFailover(location, file.file_data);
        const decryptedBuffer = decryptBuffer(encryptedBuffer);

        await pool.query(
            'INSERT INTO ActivityLogs (user_id, action, file_id, filename, details) VALUES ($1, $2, $3, $4, $5)',
            [userId, 'restore', file.id, file.filename, 'File restored successfully']
        );

        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.send(decryptedBuffer);
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ message: err.message });
    }
};
