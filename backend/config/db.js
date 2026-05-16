const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    ssl: {
        rejectUnauthorized: false
    }
};

const pool = mysql.createPool(dbConfig);

const ADMIN_EMAIL = 'pavithrathangaduraitr@gmail.com';
const ADMIN_PASSWORD = 'pavi1107';
const ADMIN_NAME = 'Pavithra Admin';

const initDB = async () => {
    try {

        const createUsersQuery = `
            CREATE TABLE IF NOT EXISTS Users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_admin TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createFilesQuery = `
            CREATE TABLE IF NOT EXISTS Files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_size INT NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                aws_url VARCHAR(1000),
                gcp_url VARCHAR(1000),
                firebase_url VARCHAR(1000),
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            );
        `;

        const createActivityLogsQuery = `
            CREATE TABLE IF NOT EXISTS ActivityLogs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                file_id INT NULL,
                filename VARCHAR(255) NULL,
                details TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE SET NULL
            );
        `;

        await pool.query(createUsersQuery);
        await pool.query(createFilesQuery);
        await pool.query(createActivityLogsQuery);

        const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await pool.query(
            `
            INSERT INTO Users (name, email, password, is_admin)
            VALUES (?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                password = VALUES(password),
                is_admin = 1
            `,
            [ADMIN_NAME, ADMIN_EMAIL, adminPasswordHash]
        );

        console.log('Database initialized successfully.');

    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

module.exports = { pool, initDB };
