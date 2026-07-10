import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-1';

export const s3BucketName = process.env.S3_BUCKET_NAME || 'parkease-bucket';

// Enable mock uploads if credentials are blank, missing, or set to mock defaults
export const isMockS3Enabled = 
  !accessKeyId || 
  !secretAccessKey || 
  accessKeyId === 'mock_aws_key' || 
  accessKeyId.trim() === '';

export const s3Client = isMockS3Enabled 
  ? null 
  : new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

console.log(`AWS S3 Upload Mode: ${isMockS3Enabled ? 'LOCAL / MOCK FALLBACK' : 'AWS S3 DIRECT'}`);
