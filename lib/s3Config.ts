export type StorageAssetType = 'ticketPdf' | 'qrImage' | 'eventBanner' | 'invoice' | 'logArchive';

const region = process.env.AWS_REGION || 'ap-south-1';
const bucket = process.env.S3_BUCKET_NAME || 'mohan12324234';

const prefixes: Record<StorageAssetType, string> = {
  ticketPdf: process.env.S3_PREFIX_TICKETS || 'tickets',
  qrImage: process.env.S3_PREFIX_QR || 'qr',
  eventBanner: process.env.S3_PREFIX_BANNERS || 'banners',
  invoice: process.env.S3_PREFIX_INVOICES || 'invoices',
  logArchive: process.env.S3_PREFIX_LOGS || 'logs'
};

export function getS3Config() {
  return { region, bucket, prefixes };
}

export function buildS3Key(type: StorageAssetType, fileName: string) {
  return `${prefixes[type]}/${fileName}`;
}

export function buildS3Url(type: StorageAssetType, fileName: string) {
  const key = buildS3Key(type, fileName);
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
