import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * QR Payload Format:
 * {
 *   "studentId": "12345",
 *   "timestamp": 1234567890,
 *   "hash": "sha256_hash"
 * }
 */

export interface QRPayload {
  studentId: string;
  timestamp: number;
  hash: string;
}

/**
 * Generate a unique secret for a student's QR code
 */
export function generateQRSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate QR payload with hash signature
 */
export function generateQRPayload(studentId: string, qrSecret: string): QRPayload {
  const timestamp = Math.floor(Date.now() / 1000);
  const dataToHash = `${studentId}:${timestamp}:${qrSecret}`;
  const hash = createHash('sha256').update(dataToHash).digest('hex');

  return {
    studentId,
    timestamp,
    hash,
  };
}

/**
 * Validate QR payload authenticity
 */
export function validateQRPayload(payload: QRPayload, qrSecret: string): boolean {
  const dataToHash = `${payload.studentId}:${payload.timestamp}:${qrSecret}`;
  const computedHash = createHash('sha256').update(dataToHash).digest('hex');

  return computedHash === payload.hash;
}

/**
 * Convert QR payload to string for QR code generation
 */
export function payloadToString(payload: QRPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parse QR payload from string
 */
export function parseQRPayload(payloadString: string): QRPayload | null {
  try {
    return JSON.parse(payloadString);
  } catch {
    return null;
  }
}

/**
 * Check if QR payload is expired (e.g., 30 days)
 */
export function isQRPayloadExpired(payload: QRPayload, maxAgeDays: number = 30): boolean {
  const now = Math.floor(Date.now() / 1000);
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  return (now - payload.timestamp) > maxAgeSeconds;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password using bcrypt
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
