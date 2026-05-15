const { pool } = require('../config/db');

const logActivity = async ({ userId, action, fileId = null, filename = null, details = null }) => {
    if (!userId || !action) {
        return;
    }

    try {
        await pool.query(
            `
                INSERT INTO ActivityLogs (user_id, action, file_id, filename, details)
                VALUES (?, ?, ?, ?, ?)
            `,
            [userId, action, fileId, filename, details]
        );
    } catch (error) {
        console.error('Activity Log Error:', error.message);
    }
};

module.exports = { logActivity };
