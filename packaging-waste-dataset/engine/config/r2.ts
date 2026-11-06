import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import env from "./env";

const longCache = "public, max-age=31536000, immutable";

const client = new S3Client({
  region: "auto",
  endpoint: env.R2.endpoint,
  credentials: { accessKeyId: env.R2.accessKeyId, secretAccessKey: env.R2.secretAccessKey },
});

export async function uploadFile(
  key: string,
  body: Uint8Array | string,
  contentType: string,
  cacheControl = longCache
) {
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
}

export async function getFile(key: string) {
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: env.R2.bucket, Key: key }));
    return (await response.Body?.transformToByteArray()) ?? null;
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

export async function deleteFile(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: env.R2.bucket, Key: key }));
}

export async function moveFile(fromKey: string, toKey: string, contentType: string) {
  await client.send(
    new CopyObjectCommand({
      Bucket: env.R2.bucket,
      CopySource: `${env.R2.bucket}/${fromKey}`,
      Key: toKey,
      MetadataDirective: "REPLACE",
      ContentType: contentType,
      CacheControl: longCache,
    })
  );
  await deleteFile(fromKey);
}

export const getPublicUrl = (key: string) => `${env.R2.publicUrl}/${key}`;
