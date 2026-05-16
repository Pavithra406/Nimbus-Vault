const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('./_lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required!' });

    const pool = getPool();
    try {
        const { rows } = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        if (!rows.length) return res.status(404).json({ message: 'User not found.' });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: 'Invalid Password!' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: 86400 });

        res.status(200).json({
            id: user.id, name: user.name, email: user.email,
            isAdmin: Boolean(user.is_admin), accessToken: token
        });

        await pool.query(
            'INSERT INTO ActivityLogs (user_id, action, details) VALUES ($1, $2, $3)',
            [user.id, 'login', 'User signed in']
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
