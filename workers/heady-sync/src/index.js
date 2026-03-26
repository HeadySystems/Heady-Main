/**
 * HeadySync — Cloudflare Worker entry point
 * © 2026 HeadySystems Inc.
 *
 * Bi-directional Linear ↔ Slack sync for HeadySystems.
 * Routes: /webhooks/linear, /webhooks/slack/events,
 *         /webhooks/slack/commands, /webhooks/slack/interactions, /health
 */

import { verifyLinearSignature, verifySlackSignature, isNewEvent, createRedis, jsonResponse } from './utils.js';
import { handleLinearWebhook } from './linear-handler.js';
import { handleSlashCommand, handleSlackEvent, handleSlackInteraction } from './slack-handler.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Health check ────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        service: 'heady-sync',
        version: '1.0.0',
        ts: Date.now(),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const redis = createRedis(env);

    try {
      switch (url.pathname) {

        // ── Linear webhook ────────────────────────────────────────
        case '/webhooks/linear': {
          const rawBody = await request.text();
          const signature = request.headers.get('linear-signature');
          const deliveryId = request.headers.get('linear-delivery');

          if (!await verifyLinearSignature(rawBody, signature, env.LINEAR_WEBHOOK_SECRET)) {
            return new Response('Invalid signature', { status: 401 });
          }

          const payload = JSON.parse(rawBody);

          // Reject stale events (>5 min)
          if (Math.abs(Date.now() - payload.webhookTimestamp) > 300_000) {
            return new Response('Stale event', { status: 400 });
          }

          // Deduplicate
          if (!await isNewEvent(redis, 'linear', deliveryId)) {
            return new Response('Duplicate', { status: 200 });
          }

          // Ack immediately, process in background
          ctx.waitUntil(handleLinearWebhook(payload, env, redis));
          return new Response('OK', { status: 200 });
        }

        // ── Slack Events API ──────────────────────────────────────
        case '/webhooks/slack/events': {
          // Slack Events API sends JSON
          const cloned = request.clone();
          const rawBody = await cloned.text();
          const timestamp = request.headers.get('x-slack-request-timestamp');
          const slackSig = request.headers.get('x-slack-signature');

          // Handle URL verification before signature check (no signing secret needed for challenge)
          try {
            const peek = JSON.parse(rawBody);
            if (peek.type === 'url_verification') {
              return jsonResponse({ challenge: peek.challenge });
            }
          } catch { /* not JSON, continue */ }

          if (!await verifySlackSignature(rawBody, timestamp, slackSig, env.SLACK_SIGNING_SECRET)) {
            return new Response('Invalid signature', { status: 401 });
          }

          // Re-create request with the raw body we already read
          const syntheticReq = new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: rawBody,
          });
          return handleSlackEvent(syntheticReq, env, ctx, redis);
        }

        // ── Slack slash commands ───────────────────────────────────
        case '/webhooks/slack/commands': {
          const rawBody = await request.text();
          const timestamp = request.headers.get('x-slack-request-timestamp');
          const slackSig = request.headers.get('x-slack-signature');

          if (!await verifySlackSignature(rawBody, timestamp, slackSig, env.SLACK_SIGNING_SECRET)) {
            return new Response('Invalid signature', { status: 401 });
          }

          const syntheticReq = new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: rawBody,
          });
          return handleSlashCommand(syntheticReq, env, ctx);
        }

        // ── Slack interactions (buttons, modals) ──────────────────
        case '/webhooks/slack/interactions': {
          const rawBody = await request.text();
          const timestamp = request.headers.get('x-slack-request-timestamp');
          const slackSig = request.headers.get('x-slack-signature');

          if (!await verifySlackSignature(rawBody, timestamp, slackSig, env.SLACK_SIGNING_SECRET)) {
            return new Response('Invalid signature', { status: 401 });
          }

          const syntheticReq = new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: rawBody,
          });
          return handleSlackInteraction(syntheticReq, env, ctx);
        }

        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      console.error('HeadySync error:', err);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};
