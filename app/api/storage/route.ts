import { buildS3Key, buildS3Url, getS3Config, StorageAssetType } from '@/lib/s3Config';
import { json } from '@/lib/serviceState';
import { putObjectToS3 } from '@/lib/s3Upload';

function buildTicketPdf(bookingId: string, eventTitle: string, seats: string[], amount: number) {
  const content = `TicketPulse Ticket\nBooking: ${bookingId}\nEvent: ${eventTitle}\nSeats: ${seats.join(', ')}\nAmount: INR ${amount}`;
  return `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length ${content.length + 40}>>stream\nBT /F1 12 Tf 20 260 Td (${content.replace(/\n/g, ' ')}) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`;
}

export async function GET() {
  return json({ storage: getS3Config() });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'upload-ticket') {
    try {
      const { region, bucket } = getS3Config();
      const qrKey = buildS3Key('qrImage', `${body.bookingId}.svg`);
      const ticketPdfKey = buildS3Key('ticketPdf', `${body.bookingId}.pdf`);

      const qrUrl = await putObjectToS3({ region, bucket, key: qrKey, body: body.qrSvg as string, contentType: 'image/svg+xml' });
      const ticketPdf = buildTicketPdf(body.bookingId, body.eventTitle, body.seats || [], body.amount || 0);
      const ticketPdfUrl = await putObjectToS3({ region, bucket, key: ticketPdfKey, body: ticketPdf, contentType: 'application/pdf' });

      return json({ uploaded: true, qrUrl, ticketPdfUrl, invoiceUrl: buildS3Url('invoice', `${body.bookingId}.pdf`), logsUrl: buildS3Url('logArchive', `${body.bookingId}.json`) });
    } catch (error) {
      return json({ uploaded: false, error: (error as Error).message }, 500);
    }
  }

  const type = body.type as StorageAssetType;
  const fileName = body.fileName as string;
  if (!type || !fileName) return json({ error: 'type and fileName required' }, 400);
  const key = buildS3Key(type, fileName);
  const url = buildS3Url(type, fileName);
  return json({ key, url, note: 'Bucket/folder configured. Use AWS SDK upload flow with this key.' });
}
