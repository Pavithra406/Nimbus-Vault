const { getPool } = require('./_lib/db');
const { verifyToken } = require('./_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const pool = getPool();

        const { rows: adminCheck } = await pool.query('SELECT is_admin FROM Users WHERE id = $1', [userId]);
        if (!adminCheck.length || !adminCheck[0].is_admin) return res.status(403).json({ message: 'Admin access required.' });

        const { rows } = await pool.query(`
            SELECT u.id, u.name, u.email, u.is_admin, u.created_at, COUNT(f.id) as files_count
            FROM Users u LEFT JOIN Files f ON u.id = f.user_id
            GROUP BY u.id ORDER BY u.created_at DESC
        `);
        res.status(200).json(rows.map((u) => ({ ...u, isAdmin: Boolean(u.is_admin) })));
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
