const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

let gcpStorage = null;
let firebaseAdmin = null;

try { gcpStorage = require('@google-cloud/storage').Storage; } catch {}
try { firebaseAdmin = require('firebase-admin'); } catch {}

const normalizeKey = (v) => (v || '').replace(/\\n/g, '\n').trim();
const isRealKey = (v) => v && v.includes('BEGIN PRIVATE KEY') && !v.includes('MOCK');

const streamToBuffer = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
});

const isS3Configured = () =>
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME &&
    process.env.AWS_REGION;

const getS3 = () => new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const getGcpBucket = () => {
    if (!gcpStorage) return null;
    const key = normalizeKey(process.env.GCP_PRIVATE_KEY);
    if (!process.env.GCP_PROJECT_ID || !isRealKey(key)) return null;
    const storage = new gcpStorage({ projectId: process.env.GCP_PROJECT_ID, credentials: { client_email: process.env.GCP_CLIENT_EMAIL, private_key: key } });
    return storage.bucket(process.env.GCP_BUCKET_NAME);
};

const getFirebaseBucket = () => {
    if (!firebaseAdmin) return null;
    const key = normalizeKey(process.env.FIREBASE_PRIVATE_KEY);
    if (!process.env.FIREBASE_PROJECT_ID || !isRealKey(key)) return null;
    if (!firebaseAdmin.apps.length) {
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }),
            storageBucket: process.env.FIREBASE_BUCKET_NAME
        });
    }
    return firebaseAdmin.storage().bucket();
};

// Upload to all configured cloud providers; returns urls and optionally the buffer for DB storage
const uploadToAllClouds = async (filename, buffer, mimetype) => {
    const results = await Promise.allSettled([
        (async () => {
            if (!isS3Configured()) throw new Error('AWS S3 not configured');
            const s3 = getS3();
            await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: filename, Body: buffer, ContentType: mimetype }));
            return `s3://${process.env.AWS_BUCKET_NAME}/${filename}`;
        })(),
        (async () => {
            const bucket = getGcpBucket();
            if (!bucket) throw new Error('GCP not configured');
            await bucket.file(filename).save(buffer, { contentType: mimetype });
            return `gs://${process.env.GCP_BUCKET_NAME}/${filename}`;
        })(),
        (async () => {
            const bucket = getFirebaseBucket();
            if (!bucket) throw new Error('Firebase not configured');
            await bucket.file(filename).save(buffer, { contentType: mimetype });
            return `firebase://${process.env.FIREBASE_BUCKET_NAME}/${filename}`;
        })()
    ]);

    const aws_url = results[0].status === 'fulfilled' ? results[0].value : null;
    const gcp_url = results[1].status === 'fulfilled' ? results[1].value : null;
    const firebase_url = results[2].status === 'fulfilled' ? results[2].value : null;

    // If no cloud provider succeeded, use DB storage as fallback
    const useDbFallback = !aws_url && !gcp_url && !firebase_url;

    return {
        aws_url,
        gcp_url,
        firebase_url,
        useDbFallback,
        buffer: useDbFallback ? buffer : null
    };
};

const downloadWithFailover = async (storageLocation, fileData) => {
    // DB fallback: if file_data is present, return it directly
    if (fileData) return fileData;

    const filename = storageLocation ? storageLocation.split('/').pop() : null;

    if (storageLocation && storageLocation.startsWith('s3://') && isS3Configured()) {
        try {
            const s3 = getS3();
            const res = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: filename }));
            return await streamToBuffer(res.Body);
        } catch (err) {
            console.error('S3 download failed:', err.message);
        }
    }

    if (storageLocation && storageLocation.startsWith('gs://')) {
        try {
            const bucket = getGcpBucket();
            if (bucket) {
                const [data] = await bucket.file(filename).download();
                return data;
            }
        } catch (err) {
            console.error('GCP download failed:', err.message);
        }
    }

    if (storageLocation && storageLocation.startsWith('firebase://')) {
        try {
            const bucket = getFirebaseBucket();
            if (bucket) {
                const [data] = await bucket.file(filename).download();
                return data;
            }
        } catch (err) {
            console.error('Firebase download failed:', err.message);
        }
    }

    throw new Error('Unable to download file from any storage provider.');
};

module.exports = { uploadToAllClouds, downloadWithFailover };
