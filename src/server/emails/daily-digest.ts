export interface MessageGroup {
  conversationId: string;
  senderEmail: string;
  messageCount: number;
  latestPreview: string;
}

export interface ApplicationGroup {
  jobId: string;
  jobTitle: string;
  applicationCount: number;
}

interface EmailResult {
  subject: string;
  html: string;
}

export function buildDailyDigestEmail({
  messageGroups,
  applicationGroups,
  appUrl,
}: {
  messageGroups: MessageGroup[];
  applicationGroups: ApplicationGroup[];
  appUrl: string;
}): EmailResult {
  const hasMessages = messageGroups.length > 0;
  const hasApplications = applicationGroups.length > 0;

  const messagePart = hasMessages
    ? `
  <h3 style="margin:24px 0 12px">New Messages</h3>
  ${messageGroups
    .map((g) => {
      const url = `${appUrl}/messages/${g.conversationId}`;
      const preview =
        g.latestPreview.length > 150 ? g.latestPreview.slice(0, 150) + "…" : g.latestPreview;
      const countNote = g.messageCount > 1 ? ` (${g.messageCount} new messages)` : "";
      return `
  <div style="margin-bottom:16px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:6px;">
    <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(g.senderEmail)}${escapeHtml(countNote)}</p>
    <p style="margin:0 0 10px;color:#374151;">${escapeHtml(preview)}</p>
    <a href="${url}" style="color:#16a34a;font-weight:600;text-decoration:none;">View Conversation →</a>
  </div>`;
    })
    .join("")}`
    : "";

  const applicationPart = hasApplications
    ? `
  <h3 style="margin:24px 0 12px">New Applications</h3>
  ${applicationGroups
    .map((g) => {
      const url = `${appUrl}/employer/jobs/${g.jobId}/applications`;
      const countLabel =
        g.applicationCount === 1 ? "1 new application" : `${g.applicationCount} new applications`;
      return `
  <div style="margin-bottom:16px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:6px;">
    <p style="margin:0 0 6px;font-weight:600;">${escapeHtml(g.jobTitle)}</p>
    <p style="margin:0 0 10px;color:#374151;">${escapeHtml(countLabel)}</p>
    <a href="${url}" style="color:#16a34a;font-weight:600;text-decoration:none;">View Applications →</a>
  </div>`;
    })
    .join("")}`
    : "";

  const subjectParts: string[] = [];
  if (hasMessages) subjectParts.push("new messages");
  if (hasApplications) subjectParts.push("new applications");
  const subject = `Your Shefa daily digest — ${subjectParts.join(" & ")}`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-top:0">Your daily digest</h2>
  <p style="color:#6b7280;">Here&rsquo;s what happened on Shefa in the last 24 hours.</p>
  ${messagePart}
  ${applicationPart}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="color:#6b7280;font-size:13px;">
    You&rsquo;re receiving this digest because your notification preferences are set to daily digest.
    You can change your preferences in your account settings.
  </p>
</body>
</html>`,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
