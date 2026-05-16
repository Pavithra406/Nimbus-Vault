const { getPool } = require('../_lib/db');
const { verifyToken } = require('../_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const pool = getPool();

        const { rows: adminCheck } = await pool.query('SELECT is_admin FROM Users WHERE id = $1', [userId]);
        if (!adminCheck.length || !adminCheck[0].is_admin) return res.status(403).json({ message: 'Admin access required.' });

        const { rows } = await pool.query(`
            SELECT f.*, u.email as user_email FROM Files f
            JOIN Users u ON f.user_id = u.id ORDER BY f.upload_date DESC
        `);
        res.status(200).json(rows.map((f) => ({
            ...f,
            replication_status: { aws: Boolean(f.aws_url), gcp: Boolean(f.gcp_url), firebase: Boolean(f.firebase_url) }
        })));
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
