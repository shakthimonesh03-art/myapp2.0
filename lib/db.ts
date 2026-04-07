import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'service-state.json');

export function loadDbState<T>(fallback: T): T {
  try {
    if (!fs.existsSync(DATA_FILE)) return fallback;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[db] load failed, using fallback', error);
    return fallback;
  }
}

export function saveDbState(state: unknown): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('[db] save failed', error);
  }
}

export function logOperation(scope: string, message: string, meta?: Record<string, unknown>) {
  console.log(`[${scope}] ${message}`, meta || {});
}
