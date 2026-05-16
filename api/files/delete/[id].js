const { getPool } = require('../../_lib/db');
const { verifyToken } = require('../../_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'DELETE') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const fileId = req.query.id;
        const pool = getPool();

        const { rowCount } = await pool.query('DELETE FROM Files WHERE id = $1 AND user_id = $2', [fileId, userId]);
        if (rowCount === 0) return res.status(404).json({ message: 'File not found or unauthorized.' });

        await pool.query(
            'INSERT INTO ActivityLogs (user_id, action, file_id, details) VALUES ($1, $2, $3, $4)',
            [userId, 'delete', fileId, 'File metadata deleted']
        );

        res.status(200).json({ message: 'File deleted successfully!' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
