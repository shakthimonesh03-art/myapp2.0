import { buildS3Key, buildS3Url, getS3Config, StorageAssetType } from '@/lib/s3Config';
import { json } from '@/lib/serviceState';

export async function GET() {
  return json({ storage: getS3Config() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const type = body.type as StorageAssetType;
  const fileName = body.fileName as string;
  if (!type || !fileName) return json({ error: 'type and fileName required' }, 400);
  const key = buildS3Key(type, fileName);
  const url = buildS3Url(type, fileName);
  return json({ key, url, note: 'Bucket/folder configured. Use AWS SDK upload flow with this key.' });
}
