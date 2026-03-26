/**
 * HeadySync — Slack Block Kit templates for Linear entities
 * © 2026 HeadySystems Inc.
 */

const STATUS_EMOJI = {
  'Backlog': '📋', 'Todo': '📝', 'In Progress': '🔄',
  'In Review': '👀', 'Done': '✅', 'Canceled': '❌',
  'Triage': '🔍', 'Duplicate': '♻️',
};

const PRIORITY_EMOJI = { 0: '⚪', 1: '🔴', 2: '🟠', 3: '🟡', 4: '🔵' };
const PRIORITY_LABEL = { 0: 'None', 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low' };

// ── Issue card ──────────────────────────────────────────────────────
export function buildIssueBlocks(issue) {
  const statusEmoji = STATUS_EMOJI[issue.state?.name] ?? '❓';
  const priEmoji = PRIORITY_EMOJI[issue.priority] ?? '⚪';
  const priLabel = PRIORITY_LABEL[issue.priority] ?? 'Unknown';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} ${issue.identifier}: ${issue.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Status:*\n${issue.state?.name ?? 'Unknown'}` },
          { type: 'mrkdwn', text: `*Priority:*\n${priEmoji} ${priLabel}` },
          { type: 'mrkdwn', text: `*Assignee:*\n${issue.assignee?.name ?? 'Unassigned'}` },
          { type: 'mrkdwn', text: `*Team:*\n${issue.team?.name ?? 'N/A'}` },
        ],
      },
      ...(issue.description ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: issue.description.length > 280
            ? issue.description.slice(0, 277) + '…'
            : issue.description,
        },
      }] : []),
      ...(issue.labels?.length ? [{
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `🏷️ ${issue.labels.map(l => `\`${l.name}\``).join(' ')}`,
        }],
      }] : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔗 Open in Linear', emoji: true },
            url: issue.url,
            action_id: 'open_linear',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '✏️ Update Status', emoji: true },
            action_id: 'update_status',
            value: issue.id,
          },
        ],
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `Synced via HeadySync • ${new Date(issue.updatedAt ?? Date.now()).toISOString().slice(0, 10)}`,
        }],
      },
    ],
    text: `${issue.identifier}: ${issue.title}`,
  };
}

// ── Status change notification ──────────────────────────────────────
export function buildStatusChangeBlocks(issue, fromStatus, toStatus) {
  const emoji = STATUS_EMOJI[toStatus] ?? '❓';
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${issue.identifier}* moved from _${fromStatus}_ → *${toStatus}*\n<${issue.url}|${issue.title}>`,
        },
      },
    ],
    text: `${issue.identifier} → ${toStatus}`,
  };
}

// ── Comment notification ────────────────────────────────────────────
export function buildCommentBlocks(issue, comment, actor) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💬 *${actor?.name ?? 'Someone'}* commented on <${issue.url}|${issue.identifier}: ${issue.title}>`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: comment.body?.length > 500
            ? comment.body.slice(0, 497) + '…'
            : (comment.body ?? ''),
        },
      },
    ],
    text: `Comment on ${issue.identifier}`,
  };
}

// ── Cycle progress report ───────────────────────────────────────────
export function buildCycleReportBlocks(cycle, completed, inProgress, total) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📊 Cycle ${cycle.number} Progress`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Completed:*\n✅ ${completed}/${total}` },
          { type: 'mrkdwn', text: `*In Progress:*\n🔄 ${inProgress}` },
          { type: 'mrkdwn', text: `*Progress:*\n${bar} ${pct}%` },
          { type: 'mrkdwn', text: `*Ends:*\n${cycle.endsAt?.slice(0, 10) ?? 'N/A'}` },
        ],
      },
    ],
    text: `Cycle ${cycle.number}: ${pct}% complete`,
  };
}
