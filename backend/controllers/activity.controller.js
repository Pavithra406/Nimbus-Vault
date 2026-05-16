const { pool } = require('../config/db');

exports.getActivity = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.name AS user_name, u.email AS user_email
             FROM ActivityLogs a
             JOIN Users u ON u.id = a.user_id
             WHERE a.user_id = $1 OR EXISTS (
                 SELECT 1 FROM Users admin_check
                 WHERE admin_check.id = $2 AND admin_check.is_admin = TRUE
             )
             ORDER BY a.created_at DESC
             LIMIT 50`,
            [req.userId, req.userId]
        );

        res.status(200).send(rows);
    } catch (error) {
        console.error('Activity Error:', error);
        res.status(500).send({ message: 'Failed to fetch activity.' });
    }
};
