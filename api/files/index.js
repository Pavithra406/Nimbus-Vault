const { getPool } = require('../_lib/db');
const { verifyToken } = require('../_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const pool = getPool();
        const { rows } = await pool.query('SELECT * FROM Files WHERE user_id = $1 ORDER BY upload_date DESC', [userId]);
        res.status(200).json(rows.map((f) => ({
            ...f,
            replication_status: { aws: Boolean(f.aws_url), gcp: Boolean(f.gcp_url), firebase: Boolean(f.firebase_url) }
        })));
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
