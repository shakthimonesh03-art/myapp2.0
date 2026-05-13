import { buildS3Key, buildS3Url, getS3Config, StorageAssetType } from '@/lib/s3Config';
import { json } from '@/lib/serviceState';
import { putObjectToS3 } from '@/lib/s3Upload';

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildTextPdf(title: string, lines: string[]) {
  const content = escapePdfText([title, ...lines].join(' '));
  return `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length ${content.length + 40}>>stream\nBT /F1 12 Tf 20 260 Td (${content}) Tj ET\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`;
}

function buildTicketPdf(bookingId: string, eventTitle: string, seats: string[], amount: number) {
  return buildTextPdf('TicketPulse Ticket', [
    `Booking: ${bookingId}`,
    `Event: ${eventTitle}`,
    `Seats: ${seats.join(', ')}`,
    `Amount: INR ${amount}`
  ]);
}

function buildInvoicePdf(bookingId: string, eventTitle: string, seats: string[], amount: number) {
  return buildTextPdf('TicketPulse Invoice', [
    `Invoice for booking: ${bookingId}`,
    `Event: ${eventTitle}`,
    `Seats: ${seats.join(', ')}`,
    `Amount paid: INR ${amount}`,
    `Generated at: ${new Date().toISOString()}`
  ]);
}

function buildBookingAuditLog(bookingId: string, eventTitle: string, seats: string[], amount: number) {
  return JSON.stringify(
    {
      bookingId,
      eventTitle,
      seats,
      amount,
      generatedAt: new Date().toISOString(),
      source: 'ticket-upload-flow'
    },
    null,
    2
  );
}

export async function GET() {
  const storage = getS3Config();
  return json({
    storage,
    hasCredentials: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === 'upload-ticket') {
    const seats = Array.isArray(body.seats) ? body.seats : [];
    const amount = typeof body.amount === 'number' ? body.amount : 0;
    if (!body.bookingId || !body.eventTitle || typeof body.qrSvg !== 'string') {
      return json({ error: 'bookingId, eventTitle and qrSvg are required' }, 400);
    }

    try {
      const { region, bucket } = getS3Config();
      const qrKey = buildS3Key('qrImage', `${body.bookingId}.svg`);
      const ticketPdfKey = buildS3Key('ticketPdf', `${body.bookingId}.pdf`);
      const invoiceKey = buildS3Key('invoice', `${body.bookingId}.pdf`);
      const auditLogKey = buildS3Key('logArchive', `${body.bookingId}.json`);
      const ticketPdf = buildTicketPdf(body.bookingId, body.eventTitle, seats, amount);
      const invoicePdf = buildInvoicePdf(body.bookingId, body.eventTitle, seats, amount);
      const bookingAuditLog = buildBookingAuditLog(body.bookingId, body.eventTitle, seats, amount);

      const [qrUrl, ticketPdfUrl, invoiceUrl, logsUrl] = await Promise.all([
        putObjectToS3({ region, bucket, key: qrKey, body: body.qrSvg as string, contentType: 'image/svg+xml' }),
        putObjectToS3({ region, bucket, key: ticketPdfKey, body: ticketPdf, contentType: 'application/pdf' }),
        putObjectToS3({ region, bucket, key: invoiceKey, body: invoicePdf, contentType: 'application/pdf' }),
        putObjectToS3({ region, bucket, key: auditLogKey, body: bookingAuditLog, contentType: 'application/json' })
      ]);

      return json({ uploaded: true, qrUrl, ticketPdfUrl, invoiceUrl, logsUrl });
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
