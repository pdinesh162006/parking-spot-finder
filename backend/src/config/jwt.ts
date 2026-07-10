import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

let JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || '';
let JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || '';

if (!JWT_PRIVATE_KEY || !JWT_PUBLIC_KEY) {
  console.log('JWT_PRIVATE_KEY or JWT_PUBLIC_KEY not detected. Generating a temporary 2048-bit RSA key pair for RS256...');
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  JWT_PRIVATE_KEY = privateKey;
  JWT_PUBLIC_KEY = publicKey;
}

export const privateKey = JWT_PRIVATE_KEY;
export const publicKey = JWT_PUBLIC_KEY;

export const JWT_ACCESS_EXPIRY = '15m'; // 15 minutes
export const JWT_REFRESH_EXPIRY_DAYS = 7; // 7 days
