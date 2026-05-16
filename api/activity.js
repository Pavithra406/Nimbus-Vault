const { getPool } = require('./_lib/db');
const { verifyToken } = require('./_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const pool = getPool();
        const { rows } = await pool.query(
            `SELECT a.*, u.name AS user_name, u.email AS user_email
             FROM ActivityLogs a
             JOIN Users u ON u.id = a.user_id
             WHERE a.user_id = $1 OR EXISTS (
                 SELECT 1 FROM Users WHERE id = $2 AND is_admin = TRUE
             )
             ORDER BY a.created_at DESC LIMIT 50`,
            [userId, userId]
        );
        res.status(200).json(rows);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
