/**
 * OWASP Top 10 Protection Middleware
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import http from 'http';

export interface SecurityHeaders {
  readonly 'Strict-Transport-Security': string;
  readonly 'X-Content-Type-Options': string;
  readonly 'X-Frame-Options': string;
  readonly 'X-XSS-Protection': string;
  readonly 'Referrer-Policy': string;
  readonly 'Content-Security-Policy': string;
  readonly 'Permissions-Policy': string;
  readonly 'Cache-Control': string;
}

export const SECURITY_HEADERS: SecurityHeaders = {
  'Strict-Transport-Security': `max-age=${FIB[16]}; includeSubDomains; preload`,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

export function applySecurityHeaders(res: http.ServerResponse): void {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, value);
  }
}

export function validateRequestSize(req: http.IncomingMessage, maxBytes: number = FIB[12] * 1024): boolean {
  const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
  return contentLength <= maxBytes;
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')           // Strip angle brackets
    .replace(/javascript:/gi, '')    // Strip javascript: URLs
    .replace(/on\w+=/gi, '')         // Strip event handlers
    .replace(/['"`;]/g, '')          // Strip quotes and semicolons
    .trim();
}

export function validatePath(path: string): boolean {
  if (path.includes('..')) return false;
  if (path.includes('\\0')) return false;
  if (/%2e%2e/i.test(path)) return false;
  if (/%252e/i.test(path)) return false;
  return true;
}

export function isValidOrigin(origin: string, allowedOrigins: ReadonlyArray<string>): boolean {
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

export class CSRFProtection {
  private readonly tokenStore: Map<string, string> = new Map();

  generateToken(sessionId: string): string {
    const token = crypto.randomUUID();
    this.tokenStore.set(sessionId, token);
    return token;
  }

  validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokenStore.get(sessionId);
    return stored === token;
  }
}

import crypto from 'crypto';
