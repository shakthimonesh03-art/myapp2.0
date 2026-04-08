import fs from 'fs';
import path from 'path';

type OtpRow = { otp_code: string; expires_at: number };
const memoryOtp = new Map<string, OtpRow>();

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'otp.sqlite');

function getDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const sqlite = require('node:sqlite') as { DatabaseSync: new (file: string) => { exec: (sql: string) => void; prepare: (sql: string) => { run: (...params: unknown[]) => void; get: (...params: unknown[]) => OtpRow | undefined } } };
    const db = new sqlite.DatabaseSync(DB_FILE);
    db.exec(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        phone TEXT PRIMARY KEY,
        otp_code TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    return db;
  } catch {
    return null;
  }
}

export function saveOtpForPhone(phone: string, otpCode: string, expiresAt: number): void {
  const db = getDb();
  if (db) {
    db.prepare('INSERT OR REPLACE INTO otp_codes(phone, otp_code, expires_at) VALUES (?, ?, ?)').run(phone, otpCode, expiresAt);
    return;
  }
  memoryOtp.set(phone, { otp_code: otpCode, expires_at: expiresAt });
}

export function verifyPhoneOtp(phone: string, otpCode: string): { ok: boolean; reason?: string } {
  const db = getDb();
  const row = db
    ? db.prepare('SELECT otp_code, expires_at FROM otp_codes WHERE phone = ?').get(phone)
    : memoryOtp.get(phone);
  if (!row) return { ok: false, reason: 'OTP not requested' };
  if (Date.now() > row.expires_at) return { ok: false, reason: 'OTP expired' };
  if (row.otp_code !== otpCode) return { ok: false, reason: 'Invalid OTP' };
  if (db) db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);
  memoryOtp.delete(phone);
  return { ok: true };
}
