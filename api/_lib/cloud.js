const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');

const normalizeKey = (v) => (v || '').replace(/\\n/g, '\n').trim();
const isRealKey = (v) => v.includes('BEGIN PRIVATE KEY') && !v.includes('MOCK');

const streamToBuffer = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
});

const getS3 = () => new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const getGcpBucket = () => {
    const key = normalizeKey(process.env.GCP_PRIVATE_KEY);
    if (!process.env.GCP_PROJECT_ID || !isRealKey(key)) return null;
    const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID, credentials: { client_email: process.env.GCP_CLIENT_EMAIL, private_key: key } });
    return storage.bucket(process.env.GCP_BUCKET_NAME);
};

const getFirebaseBucket = () => {
    const key = normalizeKey(process.env.FIREBASE_PRIVATE_KEY);
    if (!process.env.FIREBASE_PROJECT_ID || !isRealKey(key)) return null;
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }),
            storageBucket: process.env.FIREBASE_BUCKET_NAME
        });
    }
    return admin.storage().bucket();
};

const uploadToAllClouds = async (filename, buffer, mimetype) => {
    const results = await Promise.allSettled([
        (async () => {
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

    return {
        aws_url: results[0].status === 'fulfilled' ? results[0].value : null,
        gcp_url: results[1].status === 'fulfilled' ? results[1].value : null,
        firebase_url: results[2].status === 'fulfilled' ? results[2].value : null
    };
};

const downloadWithFailover = async (storageLocation) => {
    const filename = storageLocation.split('/').pop();
    try {
        const s3 = getS3();
        const res = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: filename }));
        return await streamToBuffer(res.Body);
    } catch {
        try {
            const bucket = getGcpBucket();
            if (!bucket) throw new Error('GCP not configured');
            const [data] = await bucket.file(filename).download();
            return data;
        } catch {
            const bucket = getFirebaseBucket();
            if (!bucket) throw new Error('Firebase not configured');
            const [data] = await bucket.file(filename).download();
            return data;
        }
    }
};

module.exports = { uploadToAllClouds, downloadWithFailover };
