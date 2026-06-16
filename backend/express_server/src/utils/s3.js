import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

const uploadFileToS3 = async (filePath, key, mimetype) => {
  const fileStream = fs.createReadStream(filePath);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: mimetype,
    })
  );

  return key;
};

const deleteFileFromS3 = async (key) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};

export {
  uploadFileToS3,
  deleteFileFromS3,
};