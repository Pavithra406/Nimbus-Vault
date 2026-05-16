const bcrypt = require('bcrypt');
const { getPool } = require('./_lib/db');
const { verifyToken } = require('./_lib/auth');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        const userId = verifyToken(req);
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords are required.' });

        const pool = getPool();
        const { rows } = await pool.query('SELECT * FROM Users WHERE id = $1 LIMIT 1', [userId]);
        if (!rows.length) return res.status(404).json({ message: 'User not found.' });

        const valid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE Users SET password = $1 WHERE id = $2', [hashed, userId]);
        await pool.query('INSERT INTO ActivityLogs (user_id, action, details) VALUES ($1, $2, $3)', [userId, 'password_change', 'Password updated']);

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message });
    }
};
