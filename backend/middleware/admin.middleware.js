const { pool } = require('../config/db');

const requireAdmin = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT is_admin FROM Users WHERE id = ? LIMIT 1',
            [req.userId]
        );

        if (!rows.length || !rows[0].is_admin) {
            return res.status(403).send({ message: 'Admin access required.' });
        }

        next();
    } catch (error) {
        console.error('Admin Middleware Error:', error);
        res.status(500).send({ message: 'Failed to verify admin access.' });
    }
};

module.exports = { requireAdmin };
