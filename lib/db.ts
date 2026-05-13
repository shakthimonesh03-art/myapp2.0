import fs from 'node:fs';
import path from 'node:path';
import type { AppState } from './serviceState';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'db.json');

/**
 * Writes the current appState to the db.json file synchronously.
 * This is a blocking operation, but ensures data integrity for this simple file-based DB.
 */
export function writeDbSync(state: AppState) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = JSON.stringify(state, null, 2);
    fs.writeFileSync(dbPath, data, 'utf-8');
  } catch (error) {
    console.error('FATAL: Error writing to db.json:', error);
  }
}

/**
 * Reads the state from db.json synchronously.
 * If the file doesn't exist or is invalid, it returns null.
 * @returns {AppState | null} The parsed state from the DB file or null.
 */
export function readDbSync(): AppState | null {
  try {
    if (fs.existsSync(dbPath)) {
      const rawData = fs.readFileSync(dbPath, 'utf-8');
      // Basic validation: if the file is empty or just '{}', treat as invalid.
      if (rawData && rawData.length > 2) {
        const parsed = JSON.parse(rawData) as AppState;
        // More validation: check for a key property that should always exist.
        if (parsed && parsed.seats && parsed.users) {
          return parsed;
        }
      }
    }
  } catch (error) {
    console.error('Error reading from db.json:', error);
  }
  return null;
}