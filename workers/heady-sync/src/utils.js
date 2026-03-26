/**
 * HeadySync — Cryptographic verification, dedup, retry utilities
 * © 2026 HeadySystems Inc.
 *
 * φ-aligned Fibonacci backoff: 1s, 1s, 2s, 3s, 5s, 8s, 13s
 */

import { Redis } from '@upstash/redis';

// ── Linear webhook signature verification (Web Crypto API) ──────────
export async function verifyLinearSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signatureHeader;
}

// ── Slack request signature verification (v0 scheme) ────────────────
export async function verifySlackSignature(rawBody, timestamp, signature, signingSecret) {
  if (!timestamp || !signature || !signingSecret) return false;
  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString));
  const expected = 'v0=' + [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

// ── Webhook deduplication (Upstash Redis SET NX) ────────────────────
export function createRedis(env) {
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function isNewEvent(redis, source, eventId) {
  if (!eventId) return true;
  // TTL 25200s = 7h — covers Linear's 1min + 1hr + 6hr retry window
  const result = await redis.set(`webhook:dedup:${source}:${eventId}`, 1, { nx: true, ex: 25200 });
  return result === 'OK';
}

// ── Loop prevention (origin tagging) ────────────────────────────────
export async function isEcho(redis, entityId, source) {
  const origin = await redis.get(`sync:origin:${entityId}`);
  return origin === source;
}

export async function markOrigin(redis, entityId, source) {
  await redis.set(`sync:origin:${entityId}`, source, { ex: 30 });
}

// ── φ-Fibonacci backoff retry ───────────────────────────────────────
const PHI = 1.618033988749895;

export async function withFibonacciRetry(fn, { maxRetries = 5, baseDelayMs = 1000 } = {}) {
  let prev = 0, curr = baseDelayMs;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      const delay = Math.min(curr, 30_000);
      const jittered = delay * (0.75 + Math.random() * 0.5);
      await new Promise(r => setTimeout(r, jittered));
      [prev, curr] = [curr, curr + prev];
    }
  }
}

// ── JSON response helper ────────────────────────────────────────────
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
