const { getPool } = require('../_lib/db');
const { verifyToken } = require('../_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const pool = getPool();

        const { rows: adminCheck } = await pool.query('SELECT is_admin FROM Users WHERE id = $1', [userId]);
        if (!adminCheck.length || !adminCheck[0].is_admin) return res.status(403).json({ message: 'Admin access required.' });

        const { rows: userRows } = await pool.query('SELECT COUNT(*) as totalusers FROM Users');
        const { rows: fileRows } = await pool.query('SELECT COUNT(*) as totalfiles, SUM(file_size) as totalsize FROM Files');
        const { rows: activityRows } = await pool.query(`
            SELECT a.*, u.name AS user_name FROM ActivityLogs a
            JOIN Users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 10
        `);

        res.status(200).json({
            totalUsers: parseInt(userRows[0].totalusers),
            totalFiles: parseInt(fileRows[0].totalfiles),
            totalSize: parseInt(fileRows[0].totalsize) || 0,
            recentActivity: activityRows
        });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
