const { getPool } = require('./_lib/db');
const { verifyToken } = require('./_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const pool = getPool();
        const { rows } = await pool.query(
            'SELECT id, name, email, is_admin, created_at FROM Users WHERE id = $1 LIMIT 1',
            [userId]
        );
        if (!rows.length) return res.status(404).json({ message: 'User not found.' });
        const user = rows[0];
        res.status(200).json({ id: user.id, name: user.name, email: user.email, isAdmin: Boolean(user.is_admin), createdAt: user.created_at });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
