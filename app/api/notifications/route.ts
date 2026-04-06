import { createId, json, serviceState } from '@/lib/serviceState';

export async function GET() {
  return json({ notifications: serviceState.notifications });
}

export async function POST(req: Request) {
  const body = await req.json();
  const channel = body.channel || 'EMAIL';
  const recipientEmail = body.recipientEmail || '';
  let providerStatus = 'SKIPPED';

  if (channel === 'EMAIL' && recipientEmail) {
    // External email service integration point (SendGrid/SES/etc.)
    // Configure SMTP_* env vars to enable.
    providerStatus = process.env.SMTP_HOST ? 'QUEUED' : 'SKIPPED';
  }

  const item = {
    id: createId('ntf'),
    userId: body.userId,
    type: body.type || 'booking_successful',
    status: providerStatus,
    payload: JSON.stringify({ ...(body.payload || {}), channel, recipientEmail }),
    sentAt: Date.now()
  };
  serviceState.notifications.unshift(item);
  return json({
    notification: item,
    integration: channel === 'EMAIL'
      ? (recipientEmail ? 'Email notification recorded. Set SMTP_HOST and provider credentials to enable real delivery.' : 'recipientEmail missing')
      : 'Notification recorded'
  }, 201);
}
