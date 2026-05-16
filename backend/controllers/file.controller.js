const { pool } = require('../config/db');
const { encryptBuffer, decryptBuffer } = require('../services/encryption.service');
const { uploadToAllClouds, downloadWithFailover } = require('../services/cloudStorage.service');
const { logActivity } = require('../services/activity.service');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).send({ message: "Please upload a file!" });

        const userId = req.userId;
        const originalName = req.file.originalname;
        const mimetype = req.file.mimetype;
        const size = req.file.size;

        const timestamp = Date.now();
        const uniqueFilename = `${userId}-${timestamp}-${originalName.replace(/\s+/g, '_')}`;

        const encryptedBuffer = encryptBuffer(req.file.buffer);
        const cloudUrls = await uploadToAllClouds(uniqueFilename, encryptedBuffer, mimetype);

        const { rows: [newFile] } = await pool.query(
            "INSERT INTO Files (user_id, filename, file_size, aws_url, gcp_url, firebase_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [userId, originalName, size, cloudUrls.aws_url, cloudUrls.gcp_url, cloudUrls.firebase_url]
        );

        const replicationTargets = [cloudUrls.aws_url, cloudUrls.gcp_url, cloudUrls.firebase_url].filter(Boolean);
        await logActivity({
            userId,
            action: cloudUrls.aws_url?.startsWith('local://') ? 'failover' : 'upload',
            fileId: newFile.id,
            filename: originalName,
            details: `Stored in ${replicationTargets.length} target(s)`
        });

        res.status(200).send({ message: "File uploaded successfully!", fileId: newFile.id, urls: cloudUrls });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send({ message: "Could not upload the file. " + error.message });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM Files WHERE user_id = $1 ORDER BY upload_date DESC",
            [req.userId]
        );
        res.status(200).send(rows.map((file) => ({
            ...file,
            replication_status: {
                aws: Boolean(file.aws_url),
                gcp: Boolean(file.gcp_url),
                firebase: Boolean(file.firebase_url)
            }
        })));
    } catch (error) {
        console.error("List Files Error:", error);
        res.status(500).send({ message: "Failed to fetch files." });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { rows } = await pool.query(
            "SELECT * FROM Files WHERE id = $1 AND user_id = $2",
            [fileId, req.userId]
        );

        if (rows.length === 0) return res.status(404).send({ message: "File not found or unauthorized." });

        const fileRecord = rows[0];
        const storageLocation = fileRecord.aws_url || fileRecord.gcp_url || fileRecord.firebase_url;

        if (!storageLocation) return res.status(500).send({ message: "File corrupt: no storage URLs found." });

        const encryptedBuffer = await downloadWithFailover(storageLocation);
        await logActivity({
            userId: req.userId,
            action: storageLocation.startsWith('local://') ? 'failover' : 'restore',
            fileId: fileRecord.id,
            filename: fileRecord.filename,
            details: storageLocation.startsWith('local://') ? 'Restored from local failover storage' : 'File restored successfully'
        });

        const decryptedBuffer = decryptBuffer(encryptedBuffer);
        res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.filename}"`);
        res.send(decryptedBuffer);
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).send({ message: "Failed to download file. " + error.message });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const { rowCount } = await pool.query(
            "DELETE FROM Files WHERE id = $1 AND user_id = $2",
            [fileId, req.userId]
        );

        if (rowCount === 0) return res.status(404).send({ message: "File not found or unauthorized." });

        await logActivity({ userId: req.userId, action: 'delete', fileId, details: 'File metadata deleted' });
        res.status(200).send({ message: "File deleted successfully!" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).send({ message: "Failed to delete file." });
    }
};
