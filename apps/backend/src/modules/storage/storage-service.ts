import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

/**
 * Object storage — §6.3. S3-compatible (MinIO in dev, S3/Wasabi in prod, India region).
 *
 * Uploads use presigned PUT URLs so file bytes go client→bucket directly and never
 * proxy through the app server. Downloads use short-lived presigned GET, authorized
 * against documents.visibility + RBAC by the caller before a URL is minted.
 */
const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

const PUT_TTL_SECONDS = 300; // 5 min to start an upload
const GET_TTL_SECONDS = 120; // 2 min to fetch a download

export async function presignUpload(
  storageKey: string,
  contentType: string,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: PUT_TTL_SECONDS });
}

export async function presignDownload(storageKey: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey });
  return getSignedUrl(s3, cmd, { expiresIn: GET_TTL_SECONDS });
}

/** Build a namespaced storage key. Keeps uploads partitioned by purpose + date. */
export function buildStorageKey(prefix: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${prefix}/${ymd}/${Date.now()}_${safe}`;
}
