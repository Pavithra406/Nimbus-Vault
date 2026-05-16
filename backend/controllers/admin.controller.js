const { pool } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const { rows: userRows } = await pool.query("SELECT COUNT(*) as totalusers FROM Users");
        const { rows: fileRows } = await pool.query("SELECT COUNT(*) as totalfiles, SUM(file_size) as totalsize FROM Files");
        const { rows: activityRows } = await pool.query(`
            SELECT a.*, u.name AS user_name
            FROM ActivityLogs a
            JOIN Users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
            LIMIT 10
        `);

        res.status(200).send({
            totalUsers: parseInt(userRows[0].totalusers),
            totalFiles: parseInt(fileRows[0].totalfiles),
            totalSize: parseInt(fileRows[0].totalsize) || 0,
            recentActivity: activityRows
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).send({ message: "Failed to fetch admin stats." });
    }
};

exports.getAllFiles = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT f.*, u.email as user_email
            FROM Files f
            JOIN Users u ON f.user_id = u.id
            ORDER BY f.upload_date DESC
        `);
        res.status(200).send(rows.map((file) => ({
            ...file,
            replication_status: {
                aws: Boolean(file.aws_url),
                gcp: Boolean(file.gcp_url),
                firebase: Boolean(file.firebase_url)
            }
        })));
    } catch (error) {
        console.error("Admin Files Error:", error);
        res.status(500).send({ message: "Failed to fetch all files." });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT u.id, u.name, u.email, u.is_admin, u.created_at, COUNT(f.id) as files_count
            FROM Users u
            LEFT JOIN Files f ON u.id = f.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.status(200).send(rows.map((user) => ({
            ...user,
            isAdmin: Boolean(user.is_admin)
        })));
    } catch (error) {
        console.error("Admin Users Error:", error);
        res.status(500).send({ message: "Failed to fetch all users." });
    }
};
