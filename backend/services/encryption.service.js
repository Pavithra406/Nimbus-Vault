const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits)
const IV_LENGTH = 16; // AES block size

const encryptBuffer = (buffer) => {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
        throw new Error('Invalid encryption key length. Must be 32 characters.');
    }
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(buffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Prepend the IV to the encrypted data so we can use it for decryption later
    return Buffer.concat([iv, encrypted]);
};

const decryptBuffer = (buffer) => {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
        throw new Error('Invalid encryption key length. Must be 32 characters.');
    }
    // Extract the IV from the first 16 bytes
    const iv = buffer.subarray(0, IV_LENGTH);
    const encryptedText = buffer.subarray(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
};

module.exports = {
    encryptBuffer,
    decryptBuffer
};
