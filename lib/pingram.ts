import { ChannelsEnum, Pingram, type PingramRegion, type SenderPostBody } from 'pingram';

type PingramEmailRequest = {
  html: string;
  subject: string;
  toEmail: string;
  type: string;
};

type PingramEmailResult =
  | { ok: true; trackingId: string; messages: string[] }
  | { ok: false; error: string };

function cleanEnv(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateApiKey(apiKey: string): string | null {
  if (!apiKey) return 'Email OTP service is not configured. Set PINGRAM_API_KEY in .env.';
  const normalized = apiKey.toLowerCase();
  if (normalized.includes('your_secret_key') || normalized.includes('replace_with_real_key')) {
    return 'PINGRAM_API_KEY is still a placeholder. Replace it with a real secret API key from Pingram Dashboard > API Keys.';
  }
  if (!apiKey.startsWith('pingram_sk_')) {
    return 'Invalid PINGRAM_API_KEY. Use Pingram "API Key" starting with "pingram_sk_" (do not use Client ID, Client Secret, or Public Key).';
  }
  return null;
}

function validateSenderEmail(senderEmail: string): string | null {
  if (!senderEmail) return null;
  if (!senderEmail.includes('@')) {
    return 'Invalid PINGRAM_SENDER_EMAIL. Set a valid sender address like no-reply@yourdomain.com.';
  }
  return null;
}

function resolveRegion(value: string): PingramRegion | undefined {
  const normalized = value.toLowerCase();
  if (normalized === 'us' || normalized === 'eu' || normalized === 'ca') {
    return normalized;
  }
  return undefined;
}

function extractMessageFromProviderBody(body: unknown): string {
  if (!body || typeof body !== 'object') return '';

  const asRecord = body as Record<string, unknown>;
  const message = asRecord.message;
  if (typeof message === 'string' && message.trim()) return message.trim();

  const messages = asRecord.messages;
  if (Array.isArray(messages)) {
    const first = messages.find((item) => typeof item === 'string' && item.trim());
    if (typeof first === 'string') return first.trim();
  }

  return '';
}

async function resolveProviderError(error: unknown): Promise<string> {
  const fallback = 'Unknown provider error';

  if (error instanceof Error && error.name !== 'ResponseError') {
    return error.message || fallback;
  }

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const candidate = error as { message?: unknown; response?: Response };
  if (typeof candidate.message === 'string' && candidate.message.trim() && !candidate.response) {
    return candidate.message.trim();
  }

  if (!candidate.response) {
    return fallback;
  }

  try {
    const parsed = await candidate.response.clone().json();
    const parsedMessage = extractMessageFromProviderBody(parsed);
    if (parsedMessage) return parsedMessage;
  } catch {
    // Ignore JSON parse errors and continue trying text response.
  }

  try {
    const text = (await candidate.response.clone().text()).trim();
    if (text) return text.slice(0, 180);
  } catch {
    // Ignore text parse errors and return fallback.
  }

  return fallback;
}

let cachedClient: Pingram | null = null;
let cachedSignature = '';

function getClient(apiKey: string, region?: PingramRegion): Pingram {
  const signature = `${apiKey}:${region || 'us'}`;
  if (cachedClient && cachedSignature === signature) {
    return cachedClient;
  }

  cachedClient = region ? new Pingram({ apiKey, region }) : new Pingram({ apiKey });
  cachedSignature = signature;
  return cachedClient;
}

export function getPingramEmailConfigError(): string | null {
  const apiKey = cleanEnv(process.env.PINGRAM_API_KEY);
  const senderEmail = cleanEnv(process.env.PINGRAM_SENDER_EMAIL);
  const apiKeyError = validateApiKey(apiKey);

  if (apiKeyError) return apiKeyError;

  return validateSenderEmail(senderEmail);
}

export function resolvePingramOtpNotificationType(): string {
  return cleanEnv(process.env.PINGRAM_OTP_NOTIFICATION_TYPE) || 'signup_otp';
}

export async function sendPingramEmailNotification(request: PingramEmailRequest): Promise<PingramEmailResult> {
  const apiKey = cleanEnv(process.env.PINGRAM_API_KEY);
  const senderEmail = cleanEnv(process.env.PINGRAM_SENDER_EMAIL);
  const senderName = cleanEnv(process.env.PINGRAM_SENDER_NAME) || 'TicketPulse';
  const rawRegion = cleanEnv(process.env.PINGRAM_REGION);
  const region = resolveRegion(rawRegion);
  const apiKeyError = validateApiKey(apiKey);
  const senderEmailError = validateSenderEmail(senderEmail);

  if (apiKeyError || senderEmailError) {
    return { ok: false, error: apiKeyError || senderEmailError || 'Email OTP service is not configured. Set PINGRAM_API_KEY in .env.' };
  }

  if (rawRegion && !region) {
    return { ok: false, error: 'Invalid PINGRAM_REGION. Use one of: us, eu, ca.' };
  }

  const payload: SenderPostBody = {
    type: request.type,
    to: { email: request.toEmail },
    forceChannels: [ChannelsEnum.EMAIL],
    email: {
      subject: request.subject,
      html: request.html,
      senderName,
      ...(senderEmail ? { senderEmail } : {})
    }
  };

  try {
    const response = await getClient(apiKey, region).send(payload);
    return { ok: true, trackingId: response.trackingId, messages: response.messages };
  } catch (error) {
    const providerMessage = await resolveProviderError(error);
    const isAuthDeny = /explicit deny|not authorized/i.test(providerMessage);

    // If a custom sender is blocked by provider policy, retry once with Pingram-managed sender identity.
    if (senderEmail && isAuthDeny) {
      try {
        const fallbackPayload: SenderPostBody = {
          ...payload,
          email: {
            subject: request.subject,
            html: request.html,
            senderName
          }
        };
        const retryResponse = await getClient(apiKey, region).send(fallbackPayload);
        return { ok: true, trackingId: retryResponse.trackingId, messages: retryResponse.messages };
      } catch (retryError) {
        const retryMessage = await resolveProviderError(retryError);
        return { ok: false, error: `Failed to send OTP email: ${retryMessage}` };
      }
    }

    if (isAuthDeny) {
      return {
        ok: false,
        error:
          'Failed to send OTP email: Pingram authorization denied. Use a real secret API key for this environment and either leave PINGRAM_SENDER_EMAIL empty (dev) or use a verified sender domain.'
      };
    }

    return { ok: false, error: `Failed to send OTP email: ${providerMessage}` };
  }
}
