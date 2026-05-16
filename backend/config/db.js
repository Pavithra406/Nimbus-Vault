const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS Files (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                filename VARCHAR(255) NOT NULL,
                file_size INT NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                aws_url VARCHAR(1000),
                gcp_url VARCHAR(1000),
                firebase_url VARCHAR(1000)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ActivityLogs (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                file_id INT NULL REFERENCES Files(id) ON DELETE SET NULL,
                filename VARCHAR(255) NULL,
                details TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Upsert hardcoded admin
        const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await pool.query(
            `INSERT INTO Users (name, email, password, is_admin)
             VALUES ($1, $2, $3, TRUE)
             ON CONFLICT (email) DO UPDATE
             SET name = EXCLUDED.name, password = EXCLUDED.password, is_admin = TRUE`,
            [ADMIN_NAME, ADMIN_EMAIL, adminPasswordHash]
        );

        console.log('Database and tables initialized successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

module.exports = { pool, initDB };
