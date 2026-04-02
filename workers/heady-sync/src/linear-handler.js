/**
 * HeadySync — Linear webhook handler
 * © 2026 HeadySystems Inc.
 *
 * Processes Linear webhook events (Issue, Comment, Project, Cycle)
 * and syncs them to Slack via rich Block Kit messages.
 */

import { neon } from '@neondatabase/serverless';
import { buildIssueBlocks, buildStatusChangeBlocks, buildCommentBlocks } from './blocks.js';
import { isEcho, markOrigin, withFibonacciRetry } from './utils.js';

// ── Main dispatcher ─────────────────────────────────────────────────
export async function handleLinearWebhook(payload, env, redis) {
  const { action, type, data, updatedFrom, actor } = payload;
  const sql = neon(env.DATABASE_URL);

  // Log the event
  await sql`
    INSERT INTO webhook_events (external_id, source, event_type, resource_id, payload, status)
    VALUES (${payload.webhookId ?? null}, 'linear', ${type + '.' + action}, ${data?.id ?? null}, ${JSON.stringify(payload)}, 'processing')
  `;

  switch (type) {
    case 'Issue':
      return handleIssueEvent(action, data, updatedFrom, actor, env, sql, redis);
    case 'Comment':
      return handleCommentEvent(action, data, actor, env, sql, redis);
    case 'Project':
      return handleProjectEvent(action, data, updatedFrom, env, sql);
    case 'Cycle':
      return handleCycleEvent(action, data, env, sql);
    default:
      console.log(`Unhandled Linear event type: ${type}`);
  }
}

// ── Issue events ────────────────────────────────────────────────────
async function handleIssueEvent(action, issue, updatedFrom, actor, env, sql, redis) {
  const channel = env.DEFAULT_SLACK_CHANNEL;

  if (action === 'create') {
    // Check loop prevention
    if (await isEcho(redis, issue.id, 'slack')) return;

    const card = buildIssueBlocks(issue);
    const slackResp = await postToSlack(env.SLACK_BOT_TOKEN, {
      channel,
      ...card,
    });

    if (slackResp?.ts) {
      await sql`
        INSERT INTO issue_channel_map (linear_issue_id, linear_identifier, slack_channel_id, slack_message_ts, slack_thread_ts)
        VALUES (${issue.id}, ${issue.identifier}, ${channel}, ${slackResp.ts}, ${slackResp.ts})
        ON CONFLICT (linear_issue_id, slack_channel_id) DO UPDATE SET
          slack_message_ts = EXCLUDED.slack_message_ts,
          slack_thread_ts = EXCLUDED.slack_thread_ts,
          updated_at = now()
      `;
      await markOrigin(redis, issue.id, 'linear');
    }
    return;
  }

  if (action === 'update') {
    // Find existing mapping
    const [mapping] = await sql`
      SELECT * FROM issue_channel_map WHERE linear_issue_id = ${issue.id} AND is_active LIMIT 1
    `;

    // Status change notification
    if (updatedFrom?.stateId && mapping) {
      const fromStatus = updatedFrom.state?.name ?? 'Unknown';
      const toStatus = issue.state?.name ?? 'Unknown';
      const card = buildStatusChangeBlocks(issue, fromStatus, toStatus);
      await postToSlack(env.SLACK_BOT_TOKEN, {
        channel: mapping.slack_channel_id,
        thread_ts: mapping.slack_thread_ts,
        ...card,
      });
    }

    // Priority escalation alert (to Urgent)
    if (updatedFrom?.priority && issue.priority === 1 && updatedFrom.priority !== 1) {
      await postToSlack(env.SLACK_BOT_TOKEN, {
        channel,
        text: `🔴 *URGENT* — <${issue.url}|${issue.identifier}: ${issue.title}> was escalated to Urgent priority by ${actor?.name ?? 'someone'}`,
      });
    }

    // If no mapping exists yet, create card for the update
    if (!mapping) {
      const card = buildIssueBlocks(issue);
      const slackResp = await postToSlack(env.SLACK_BOT_TOKEN, { channel, ...card });
      if (slackResp?.ts) {
        await sql`
          INSERT INTO issue_channel_map (linear_issue_id, linear_identifier, slack_channel_id, slack_message_ts, slack_thread_ts)
          VALUES (${issue.id}, ${issue.identifier}, ${channel}, ${slackResp.ts}, ${slackResp.ts})
        `;
      }
    }
    return;
  }

  if (action === 'remove') {
    await sql`UPDATE issue_channel_map SET is_active = false, updated_at = now() WHERE linear_issue_id = ${issue.id}`;
  }
}

// ── Comment events ──────────────────────────────────────────────────
async function handleCommentEvent(action, comment, actor, env, sql, redis) {
  if (action !== 'create') return;
  if (await isEcho(redis, comment.id, 'slack')) return;

  const issueId = comment.issueId ?? comment.issue?.id;
  if (!issueId) return;

  const [mapping] = await sql`
    SELECT * FROM issue_channel_map WHERE linear_issue_id = ${issueId} AND is_active LIMIT 1
  `;
  if (!mapping) return;

  const issue = comment.issue ?? { identifier: mapping.linear_identifier, url: '', title: '' };
  const card = buildCommentBlocks(issue, comment, actor);

  const slackResp = await postToSlack(env.SLACK_BOT_TOKEN, {
    channel: mapping.slack_channel_id,
    thread_ts: mapping.slack_thread_ts,
    ...card,
  });

  if (slackResp?.ts) {
    await sql`
      INSERT INTO comment_mappings (linear_comment_id, linear_issue_id, slack_channel_id, slack_message_ts, slack_thread_ts, direction)
      VALUES (${comment.id}, ${issueId}, ${mapping.slack_channel_id}, ${slackResp.ts}, ${mapping.slack_thread_ts}, 'linear→slack')
    `;
    await markOrigin(redis, comment.id, 'linear');
  }
}

// ── Project events ──────────────────────────────────────────────────
async function handleProjectEvent(action, project, updatedFrom, env, _sql) {
  if (action === 'update' && updatedFrom?.state) {
    await postToSlack(env.SLACK_BOT_TOKEN, {
      channel: env.DEFAULT_SLACK_CHANNEL,
      text: `📁 Project *${project.name}* moved to _${project.state}_ ${project.url ? `<${project.url}|View>` : ''}`,
    });
  }
}

// ── Cycle events ────────────────────────────────────────────────────
async function handleCycleEvent(action, cycle, env, _sql) {
  if (action === 'update' && cycle.completedAt) {
    await postToSlack(env.SLACK_BOT_TOKEN, {
      channel: env.DEFAULT_SLACK_CHANNEL,
      text: `🏁 Cycle ${cycle.number} completed! ${cycle.completedScopeHistory?.length ?? 0} issues finished.`,
    });
  }
}

// ── Slack API helper ────────────────────────────────────────────────
async function postToSlack(token, body) {
  return withFibonacciRetry(async () => {
    const resp = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
    return data;
  }, { maxRetries: 3 });
}
