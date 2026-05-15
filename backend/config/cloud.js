const { S3Client } = require('@aws-sdk/client-s3');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
require('dotenv').config();

const normalizePrivateKey = (value) => (value || '').replace(/\\n/g, '\n').trim();
const looksLikePrivateKey = (value) =>
    value.includes('BEGIN PRIVATE KEY') && !value.includes('MOCK');

// --- AWS S3 Setup ---
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// --- GCP Storage Setup ---
const gcpPrivateKey = normalizePrivateKey(process.env.GCP_PRIVATE_KEY);
let gcpBucket = null;

if (process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && looksLikePrivateKey(gcpPrivateKey)) {
    try {
        const gcpStorage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            credentials: {
                client_email: process.env.GCP_CLIENT_EMAIL,
                private_key: gcpPrivateKey
            }
        });
        gcpBucket = gcpStorage.bucket(process.env.GCP_BUCKET_NAME);
    } catch (error) {
        console.warn('GCP storage is disabled:', error.message);
    }
} else {
    console.warn('GCP storage is disabled: missing or placeholder credentials in backend/.env');
}

// --- Firebase Storage Setup ---
const firebasePrivateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
let firebaseBucket = null;

if (!admin.apps.length) {
    if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        looksLikePrivateKey(firebasePrivateKey)
    ) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: firebasePrivateKey
                }),
                storageBucket: process.env.FIREBASE_BUCKET_NAME
            });
            firebaseBucket = admin.storage().bucket();
        } catch (error) {
            console.warn('Firebase storage is disabled:', error.message);
        }
    } else {
        console.warn('Firebase storage is disabled: missing or placeholder credentials in backend/.env');
    }
} else {
    firebaseBucket = admin.storage().bucket();
}

module.exports = {
    s3,
    gcpBucket,
    firebaseBucket
};
