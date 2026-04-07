import { createId, hashPassword, json, serviceState } from '@/lib/serviceState';
import { pushOtpAuditToQueue, sendOtpSms } from '@/lib/aws';
import { saveOtpForPhone, verifyPhoneOtp } from '@/lib/otpSql';

function normalizePhone(raw: string) {
  const clean = String(raw || '').replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.length === 10) return `+91${clean}`;
  return clean;
}

export async function OPTIONS() {
  return json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.phone || '');
    const otp = String(body.otp || '').trim();

    if (body.action === 'admin-demo-login') {
      let admin = serviceState.users.find((user) => user.role === 'admin');
      if (!admin) {
        admin = {
          id: createId('u'),
          name: 'Admin User',
          email: 'admin@ticketpulse.app',
          phone: '+919999999999',
          role: 'admin',
          cityPreference: 'Bengaluru',
          passwordHash: hashPassword('admin123'),
          createdAt: Date.now(),
          otpVerifiedAt: Date.now()
        };
        serviceState.users.push(admin);
      }
      return json({ user: admin, accessToken: createId('jwt'), refreshToken: createId('refresh') });
    }

    if (body.action === 'request-otp') {
      if (!phone || phone.length < 11) return json({ error: 'Valid phone number is required' }, 400);
      const code = `${Math.floor(100000 + Math.random() * 900000)}`;
      const expiresAt = Date.now() + 5 * 60 * 1000;
      saveOtpForPhone(phone, code, expiresAt);
      const sns = await sendOtpSms(phone, code);
      await pushOtpAuditToQueue({ type: 'otp_requested', phone, at: Date.now(), snsStatus: sns.sent ? 'SENT' : 'FAILED' });
      return json({
        message: sns.sent ? 'OTP sent to phone' : 'OTP saved. SMS delivery failed, use dev OTP shown below.',
        otpCode: code,
        troubleshooting: sns.sent ? [] : [
          'AWS credentials are missing/invalid',
          'SNS SMS spending limit or sandbox restrictions',
          'Phone format not E.164 (example: +919999999999)',
          'SNS region mismatch vs configured topic/account',
          'IAM role/user does not allow sns:Publish'
        ],
        snsError: sns.sent ? null : sns.error
      });
    }

    if (body.action === 'signup') {
    if (!phone) return json({ error: 'Phone number is required' }, 400);
    const otpStatus = verifyPhoneOtp(phone, otp);
    if (!otpStatus.ok) return json({ error: otpStatus.reason || 'Invalid OTP' }, 401);
    if (serviceState.users.find((user) => user.phone === phone)) return json({ error: 'Phone already exists' }, 409);
    const user = {
      id: createId('u'),
      name: body.name || 'New User',
      email: String(body.email || '').trim().toLowerCase(),
      phone,
      role: body.role || 'customer',
      cityPreference: body.cityPreference || '',
      passwordHash: hashPassword('otp-auth'),
      createdAt: Date.now(),
      otpVerifiedAt: Date.now()
    };
    serviceState.users.push(user);
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

    if (body.action === 'login') {
    if (!phone) return json({ error: 'Phone number is required' }, 400);
    const otpStatus = verifyPhoneOtp(phone, otp);
    if (!otpStatus.ok) return json({ error: otpStatus.reason || 'Invalid OTP' }, 401);
    let user = serviceState.users.find((item) => item.phone === phone);
    if (!user) {
      user = {
        id: createId('u'),
        name: 'New User',
        email: '',
        phone,
        role: 'customer',
        cityPreference: '',
        passwordHash: hashPassword('otp-auth'),
        createdAt: Date.now(),
        otpVerifiedAt: Date.now()
      };
      serviceState.users.push(user);
    }
    return json({ user, accessToken: createId('jwt'), refreshToken: createId('refresh') });
  }

    if (body.action === 'refresh') {
      return json({ accessToken: createId('jwt') });
    }

    if (body.action === 'forgot-password') {
      return json({ message: 'Password reset link generated (mock).' });
    }

    return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
    return json({ error: 'Auth service failed', detail: (error as Error).message }, 500);
  }
}
