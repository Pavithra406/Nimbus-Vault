const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { logActivity } = require('../services/activity.service');
require('dotenv').config();

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).send({ message: "Name, email, and password are required!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO Users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );

        const [userCountRows] = await pool.query("SELECT COUNT(*) AS totalUsers FROM Users");
        if (userCountRows[0].totalUsers === 1) {
            await pool.query("UPDATE Users SET is_admin = 1 WHERE id = ?", [result.insertId]);
        }
        await logActivity({
            userId: result.insertId,
            action: 'register',
            details: 'User account created'
        });

        res.status(201).send({ message: "User registered successfully!", userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).send({ message: "Email already exists!" });
        }
        console.error("Register Error:", error);
        res.status(500).send({ message: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ message: "Email and password are required!" });
    }

    try {
        const [rows] = await pool.query("SELECT * FROM Users WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(404).send({ message: "User Not found." });
        }

        const user = rows[0];
        const passwordIsValid = await bcrypt.compare(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).send({ message: "Invalid Password!" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });

        res.status(200).send({
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: Boolean(user.is_admin),
            accessToken: token
        });
        await logActivity({
            userId: user.id,
            action: 'login',
            details: 'User signed in'
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send({ message: error.message });
    }
};

exports.me = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, is_admin, created_at FROM Users WHERE id = ? LIMIT 1",
            [req.userId]
        );

        if (!rows.length) {
            return res.status(404).send({ message: "User not found." });
        }

        const user = rows[0];
        res.status(200).send({
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: Boolean(user.is_admin),
            createdAt: user.created_at
        });
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).send({ message: error.message });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).send({ message: "Current password and new password are required." });
    }

    try {
        const [rows] = await pool.query("SELECT * FROM Users WHERE id = ? LIMIT 1", [req.userId]);

        if (!rows.length) {
            return res.status(404).send({ message: "User not found." });
        }

        const user = rows[0];
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(401).send({ message: "Current password is incorrect." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE Users SET password = ? WHERE id = ?", [hashedPassword, req.userId]);
        await logActivity({
            userId: req.userId,
            action: 'password_change',
            details: 'Password updated'
        });

        res.status(200).send({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).send({ message: error.message });
    }
};
