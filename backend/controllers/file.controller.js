const { pool } = require('../config/db');
const { encryptBuffer, decryptBuffer } = require('../services/encryption.service');
const { uploadToAllClouds, downloadWithFailover } = require('../services/cloudStorage.service');
const { logActivity } = require('../services/activity.service');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "Please upload a file!" });
        }

        const userId = req.userId;
        const originalName = req.file.originalname;
        const mimetype = req.file.mimetype;
        const size = req.file.size;
        
        // Generate unique filename to prevent overwrites in storage
        const timestamp = Date.now();
        const uniqueFilename = `${userId}-${timestamp}-${originalName.replace(/\s+/g, '_')}`;

        // 1. Encrypt the file buffer
        const encryptedBuffer = encryptBuffer(req.file.buffer);

        // 2. Upload to all clouds
        const cloudUrls = await uploadToAllClouds(uniqueFilename, encryptedBuffer, mimetype);

        // 3. Save to database
        const [result] = await pool.query(
            "INSERT INTO Files (user_id, filename, file_size, aws_url, gcp_url, firebase_url) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, originalName, size, cloudUrls.aws_url, cloudUrls.gcp_url, cloudUrls.firebase_url]
        );

        const replicationTargets = [cloudUrls.aws_url, cloudUrls.gcp_url, cloudUrls.firebase_url].filter(Boolean);
        await logActivity({
            userId,
            action: cloudUrls.aws_url?.startsWith('local://') ? 'failover' : 'upload',
            fileId: result.insertId,
            filename: originalName,
            details: `Stored in ${replicationTargets.length} target(s)`
        });

        res.status(200).send({
            message: "File uploaded successfully!",
            fileId: result.insertId,
            urls: cloudUrls
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send({ message: "Could not upload the file. " + error.message });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM Files WHERE user_id = ? ORDER BY upload_date DESC", [req.userId]);
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

        // 1. Get file metadata from database
        const [rows] = await pool.query("SELECT * FROM Files WHERE id = ? AND user_id = ?", [fileId, req.userId]);
        if (rows.length === 0) {
            return res.status(404).send({ message: "File not found or unauthorized." });
        }

        const fileRecord = rows[0];
        
        let storageLocation = null;
        if (fileRecord.aws_url) storageLocation = fileRecord.aws_url;
        else if (fileRecord.gcp_url) storageLocation = fileRecord.gcp_url;
        else if (fileRecord.firebase_url) storageLocation = fileRecord.firebase_url;

        if (!storageLocation) {
            return res.status(500).send({ message: "File corrupt: no storage URLs found." });
        }

        // 2. Download from cloud with failover
        const encryptedBuffer = await downloadWithFailover(storageLocation);
        await logActivity({
            userId: req.userId,
            action: storageLocation.startsWith('local://') ? 'failover' : 'restore',
            fileId: fileRecord.id,
            filename: fileRecord.filename,
            details: storageLocation.startsWith('local://')
                ? 'Restored from local failover storage'
                : 'File restored successfully'
        });

        // 3. Decrypt the file
        const decryptedBuffer = decryptBuffer(encryptedBuffer);

        // 4. Send the file to client
        res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.filename}"`);
        res.send(decryptedBuffer);

    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).send({ message: "Failed to download file. " + error.message });
    }
};

exports.deleteFile = async (req, res) => {
    // Basic delete just from DB for now, in a real system we'd delete from clouds too.
    try {
        const fileId = req.params.id;
        const [result] = await pool.query("DELETE FROM Files WHERE id = ? AND user_id = ?", [fileId, req.userId]);
        
        if (result.affectedRows === 0) {
             return res.status(404).send({ message: "File not found or unauthorized." });
        }
        await logActivity({
            userId: req.userId,
            action: 'delete',
            fileId,
            details: 'File metadata deleted'
        });
        res.status(200).send({ message: "File deleted successfully!" });
    } catch (error) {
        console.error("Delete Error:", error);
         res.status(500).send({ message: "Failed to delete file." });
    }
};
