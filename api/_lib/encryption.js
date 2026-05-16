const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const encryptBuffer = (buffer) => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 32) throw new Error('Invalid encryption key. Must be 32 characters.');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
};

const decryptBuffer = (buffer) => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 32) throw new Error('Invalid encryption key. Must be 32 characters.');
    const iv = buffer.subarray(0, IV_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv.subarray(0, IV_LENGTH));
    return Buffer.concat([decipher.update(buffer.subarray(IV_LENGTH)), decipher.final()]);
};

module.exports = { encryptBuffer, decryptBuffer };
