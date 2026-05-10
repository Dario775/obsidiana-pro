import crypto from 'crypto';
const fs = require('fs');

const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'.repeat(2).slice(0, 128);
const challenge = crypto.createHash('sha256').update(verifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

console.log('Verifier:', verifier);
console.log('Challenge:', challenge);
