const bcrypt = require('bcrypt');
const { getPool } = require('./_lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required!' });

    const pool = getPool();
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows: [newUser] } = await pool.query(
            'INSERT INTO Users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
            [name, email, hashedPassword]
        );
        const { rows: countRows } = await pool.query('SELECT COUNT(*) AS totalusers FROM Users');
        if (parseInt(countRows[0].totalusers) === 1) {
            await pool.query('UPDATE Users SET is_admin = TRUE WHERE id = $1', [newUser.id]);
        }
        await pool.query(
            'INSERT INTO ActivityLogs (user_id, action, details) VALUES ($1, $2, $3)',
            [newUser.id, 'register', 'User account created']
        );
        res.status(201).json({ message: 'User registered successfully!', userId: newUser.id });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Email already exists!' });
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
