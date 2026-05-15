const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs/promises');
const path = require('path');
const { s3, gcpBucket, firebaseBucket } = require('../config/cloud');
require('dotenv').config();

// AWS uses stream for body. We'll need a helper to stream to buffer if downloading.
const streamToBuffer = async (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

const ensureProvider = (provider, client) => {
    if (!client) {
        throw new Error(`${provider} storage is not configured. Add valid credentials in backend/.env.`);
    }
};

const localStorageEnabled = process.env.LOCAL_STORAGE_FALLBACK !== 'false';
const localStorageDir = path.join(__dirname, '..', 'storage', 'uploads');

const uploadToLocal = async (filename, buffer) => {
    if (!localStorageEnabled) {
        throw new Error('Local fallback storage is disabled.');
    }

    await fs.mkdir(localStorageDir, { recursive: true });
    const filePath = path.join(localStorageDir, filename);
    await fs.writeFile(filePath, buffer);
    return `local://${filename}`;
};

const downloadFromLocal = async (filename) => {
    if (!localStorageEnabled) {
        throw new Error('Local fallback storage is disabled.');
    }

    const filePath = path.join(localStorageDir, filename);
    return await fs.readFile(filePath);
};

const uploadToAWS = async (filename, buffer, mimetype) => {
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: filename,
            Body: buffer,
            ContentType: mimetype
        });
        await s3.send(command);
        return `s3://${process.env.AWS_BUCKET_NAME}/${filename}`;
    } catch (error) {
        console.error('AWS Upload Error:', error.message);
        throw error;
    }
};

const uploadToGCP = async (filename, buffer, mimetype) => {
    try {
        ensureProvider('GCP', gcpBucket);
        const file = gcpBucket.file(filename);
        await file.save(buffer, {
            contentType: mimetype
        });
        return `gs://${process.env.GCP_BUCKET_NAME}/${filename}`;
    } catch (error) {
        console.error('GCP Upload Error:', error.message);
        throw error;
    }
};

const uploadToFirebase = async (filename, buffer, mimetype) => {
    try {
        ensureProvider('Firebase', firebaseBucket);
        const file = firebaseBucket.file(filename);
        await file.save(buffer, {
            contentType: mimetype
        });
        return `firebase://${process.env.FIREBASE_BUCKET_NAME}/${filename}`;
    } catch (error) {
        console.error('Firebase Upload Error:', error.message);
        throw error;
    }
};

const uploadToAllClouds = async (filename, buffer, mimetype) => {
    const results = await Promise.allSettled([
        uploadToAWS(filename, buffer, mimetype),
        uploadToGCP(filename, buffer, mimetype),
        uploadToFirebase(filename, buffer, mimetype)
    ]);

    const cloudUrls = {
        aws_url: results[0].status === 'fulfilled' ? results[0].value : null,
        gcp_url: results[1].status === 'fulfilled' ? results[1].value : null,
        firebase_url: results[2].status === 'fulfilled' ? results[2].value : null
    };

    if (!cloudUrls.aws_url && !cloudUrls.gcp_url && !cloudUrls.firebase_url) {
        const localUrl = await uploadToLocal(filename, buffer);
        return {
            aws_url: localUrl,
            gcp_url: null,
            firebase_url: null
        };
    }

    return cloudUrls;
};

const downloadFromAWS = async (filename) => {
    ensureProvider('AWS', s3);
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename
    });
    const response = await s3.send(command);
    return await streamToBuffer(response.Body);
};

const downloadFromGCP = async (filename) => {
    ensureProvider('GCP', gcpBucket);
    const [data] = await gcpBucket.file(filename).download();
    return data;
};

const downloadFromFirebase = async (filename) => {
    ensureProvider('Firebase', firebaseBucket);
    const [data] = await firebaseBucket.file(filename).download();
    return data;
};

const extractStorageKey = (storageLocation) => {
    if (!storageLocation) {
        throw new Error('Missing storage location.');
    }

    if (storageLocation.startsWith('local://')) {
        return storageLocation.replace('local://', '');
    }

    return storageLocation.split('/').pop();
};

const downloadWithFailover = async (storageLocation) => {
    if (storageLocation.startsWith('local://')) {
        return await downloadFromLocal(extractStorageKey(storageLocation));
    }

    const filename = extractStorageKey(storageLocation);
    console.log(`Attempting to download ${filename} from AWS...`);
    try {
        return await downloadFromAWS(filename);
    } catch (awsError) {
        console.warn(`AWS Download failed for ${filename}. Failing over to GCP...`);
        try {
            return await downloadFromGCP(filename);
        } catch (gcpError) {
            console.warn(`GCP Download failed for ${filename}. Failing over to Firebase...`);
            try {
                return await downloadFromFirebase(filename);
            } catch (firebaseError) {
                console.error(`Firebase Download failed for ${filename}. All clouds failed.`);
                throw new Error('File could not be retrieved from any cloud provider.');
            }
        }
    };
};

module.exports = {
    uploadToAllClouds,
    downloadWithFailover
};
