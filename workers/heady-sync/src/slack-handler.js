/**
 * HeadySync — Slack event, slash command, and interaction handler
 * © 2026 HeadySystems Inc.
 *
 * Handles /linear-create, /linear-status slash commands,
 * Slack Events API (message, reaction_added, app_mention),
 * and interactive button callbacks.
 */

import { neon } from '@neondatabase/serverless';
import { isEcho, markOrigin, jsonResponse, withFibonacciRetry } from './utils.js';
import { buildIssueBlocks } from './blocks.js';

// ── Slash commands ──────────────────────────────────────────────────
export async function handleSlashCommand(request, env, ctx) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const command = params.get('command');
  const text = params.get('text')?.trim() ?? '';
  const responseUrl = params.get('response_url');
  const channelId = params.get('channel_id');
  const userId = params.get('user_id');

  if (command === '/linear-create') {
    if (!text) {
      return jsonResponse({ response_type: 'ephemeral', text: 'Usage: `/linear-create <title>`' });
    }
    ctx.waitUntil(createIssueAsync(text, channelId, responseUrl, env));
    return jsonResponse({ response_type: 'ephemeral', text: '⏳ Creating Linear issue…' });
  }

  if (command === '/linear-status') {
    if (!text) {
      return jsonResponse({ response_type: 'ephemeral', text: 'Usage: `/linear-status HEA-123`' });
    }
    ctx.waitUntil(fetchStatusAsync(text, responseUrl, env));
    return jsonResponse({ response_type: 'ephemeral', text: '🔍 Looking up…' });
  }

  return jsonResponse({
    response_type: 'ephemeral',
    text: '`/linear-create <title>` — create an issue\n`/linear-status <HEA-123>` — check issue status',
  });
}

async function createIssueAsync(title, channelId, responseUrl, env) {
  try {
    const resp = await linearGraphQL(env.LINEAR_API_KEY, `
      mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier title url state { name } priority assignee { name } team { name } }
        }
      }
    `, {
      input: {
        title,
        teamId: env.LINEAR_TEAM_ID,
        priority: 3, // Medium by default
      },
    });

    const issue = resp?.data?.issueCreate?.issue;
    if (!issue) throw new Error('Issue creation failed');

    const card = buildIssueBlocks(issue);
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_type: 'in_channel', ...card }),
    });

    // Save mapping
    const sql = neon(env.DATABASE_URL);
    const slackResp = await postToSlackChannel(env.SLACK_BOT_TOKEN, channelId, card);
    if (slackResp?.ts) {
      await sql`
        INSERT INTO issue_channel_map (linear_issue_id, linear_identifier, slack_channel_id, slack_message_ts, slack_thread_ts, sync_direction)
        VALUES (${issue.id}, ${issue.identifier}, ${channelId}, ${slackResp.ts}, ${slackResp.ts}, 'slack_to_linear')
      `;
    }
  } catch (err) {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_type: 'ephemeral', text: `❌ Error: ${err.message}` }),
    });
  }
}

async function fetchStatusAsync(identifier, responseUrl, env) {
  try {
    const resp = await linearGraphQL(env.LINEAR_API_KEY, `
      query($filter: IssueFilter) {
        issues(filter: $filter, first: 1) {
          nodes { id identifier title url description state { name } priority assignee { name } team { name } labels { nodes { name } } updatedAt }
        }
      }
    `, {
      filter: { identifier: { eq: identifier.toUpperCase() } },
    });

    const issue = resp?.data?.issues?.nodes?.[0];
    if (!issue) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_type: 'ephemeral', text: `❌ Issue ${identifier} not found` }),
      });
      return;
    }

    issue.labels = issue.labels?.nodes ?? [];
    const card = buildIssueBlocks(issue);
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_type: 'ephemeral', ...card }),
    });
  } catch (err) {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_type: 'ephemeral', text: `❌ Error: ${err.message}` }),
    });
  }
}

// ── Slack Events API ────────────────────────────────────────────────
export async function handleSlackEvent(request, env, ctx, redis) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  // URL verification challenge
  if (body.type === 'url_verification') {
    return jsonResponse({ challenge: body.challenge });
  }

  if (body.type !== 'event_callback') return jsonResponse({ ok: true });

  const event = body.event;
  if (!event) return jsonResponse({ ok: true });

  // Ignore bot messages to prevent loops
  if (event.bot_id || event.subtype === 'bot_message') return jsonResponse({ ok: true });

  ctx.waitUntil(processSlackEvent(event, env, redis));
  return jsonResponse({ ok: true });
}

async function processSlackEvent(event, env, redis) {
  const sql = neon(env.DATABASE_URL);

  // Thread replies → Linear comments
  if (event.type === 'message' && event.thread_ts && event.thread_ts !== event.ts) {
    const [mapping] = await sql`
      SELECT * FROM issue_channel_map
      WHERE slack_channel_id = ${event.channel}
        AND slack_thread_ts = ${event.thread_ts}
        AND is_active
      LIMIT 1
    `;
    if (!mapping) return;

    // Prevent echo
    if (await isEcho(redis, event.ts, 'linear')) return;

    // Create Linear comment
    const resp = await linearGraphQL(env.LINEAR_API_KEY, `
      mutation($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id }
        }
      }
    `, {
      input: {
        issueId: mapping.linear_issue_id,
        body: `**Slack** (${event.user ?? 'unknown'}): ${event.text}`,
      },
    });

    const commentId = resp?.data?.commentCreate?.comment?.id;
    if (commentId) {
      await markOrigin(redis, commentId, 'slack');
      await sql`
        INSERT INTO comment_mappings (linear_comment_id, linear_issue_id, slack_channel_id, slack_message_ts, slack_thread_ts, direction)
        VALUES (${commentId}, ${mapping.linear_issue_id}, ${event.channel}, ${event.ts}, ${event.thread_ts}, 'slack→linear')
      `;
    }
    return;
  }

  // Reaction-based status changes
  if (event.type === 'reaction_added') {
    const reactionMap = {
      'white_check_mark': 'Done',
      'eyes': 'In Review',
      'arrows_counterclockwise': 'In Progress',
      'wastebasket': 'Canceled',
    };
    const targetStatus = reactionMap[event.reaction];
    if (!targetStatus) return;

    const [mapping] = await sql`
      SELECT * FROM issue_channel_map
      WHERE slack_channel_id = ${event.item?.channel}
        AND slack_message_ts = ${event.item?.ts}
        AND is_active
      LIMIT 1
    `;
    if (!mapping) return;

    // Get workflow state ID for the target status
    const statesResp = await linearGraphQL(env.LINEAR_API_KEY, `
      query($teamId: String!) {
        workflowStates(filter: { team: { id: { eq: $teamId } } }) {
          nodes { id name type }
        }
      }
    `, { teamId: env.LINEAR_TEAM_ID });

    const state = statesResp?.data?.workflowStates?.nodes?.find(s => s.name === targetStatus);
    if (!state) return;

    await linearGraphQL(env.LINEAR_API_KEY, `
      mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }
    `, { id: mapping.linear_issue_id, input: { stateId: state.id } });
  }
}

// ── Slack Interactions (button callbacks) ────────────────────────────
export async function handleSlackInteraction(request, env, ctx) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get('payload');
  if (!payloadStr) return jsonResponse({ ok: true });

  const payload = JSON.parse(payloadStr);

  if (payload.type === 'block_actions') {
    for (const action of (payload.actions ?? [])) {
      if (action.action_id === 'update_status') {
        // Open a modal to select new status
        ctx.waitUntil(openStatusModal(payload.trigger_id, action.value, env));
        return jsonResponse({ ok: true });
      }
    }
  }

  if (payload.type === 'view_submission') {
    const issueId = payload.view?.private_metadata;
    const selectedStatus = payload.view?.state?.values?.status_block?.status_select?.selected_option?.value;
    if (issueId && selectedStatus) {
      ctx.waitUntil(updateIssueStatus(issueId, selectedStatus, env));
    }
    return jsonResponse({ response_action: 'clear' });
  }

  return jsonResponse({ ok: true });
}

async function openStatusModal(triggerId, issueId, env) {
  // Fetch workflow states
  const statesResp = await linearGraphQL(env.LINEAR_API_KEY, `
    query($teamId: String!) {
      workflowStates(filter: { team: { id: { eq: $teamId } } }) {
        nodes { id name type }
      }
    }
  `, { teamId: env.LINEAR_TEAM_ID });

  const states = statesResp?.data?.workflowStates?.nodes ?? [];
  const options = states.map(s => ({
    text: { type: 'plain_text', text: s.name },
    value: s.id,
  }));

  await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        private_metadata: issueId,
        title: { type: 'plain_text', text: 'Update Status' },
        submit: { type: 'plain_text', text: 'Update' },
        blocks: [{
          type: 'input',
          block_id: 'status_block',
          label: { type: 'plain_text', text: 'New Status' },
          element: {
            type: 'static_select',
            action_id: 'status_select',
            options,
          },
        }],
      },
    }),
  });
}

async function updateIssueStatus(issueId, stateId, env) {
  await linearGraphQL(env.LINEAR_API_KEY, `
    mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) { success }
    }
  `, { id: issueId, input: { stateId } });
}

// ── Linear GraphQL client ───────────────────────────────────────────
async function linearGraphQL(apiKey, query, variables = {}) {
  return withFibonacciRetry(async () => {
    const resp = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    const data = await resp.json();
    if (data.errors?.length) throw new Error(data.errors[0].message);
    return data;
  }, { maxRetries: 3 });
}

async function postToSlackChannel(token, channel, body) {
  const resp = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel, ...body }),
  });
  return resp.json();
}
