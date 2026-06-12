import { FEEDBACK_CATEGORY_LABELS } from "@/lib/constants/labels";

interface EmailResult {
  subject: string;
  html: string;
}

export function buildFeedbackNotifyEmail({
  category,
  message,
  submitterEmail,
  appUrl,
}: {
  category: string;
  message: string;
  submitterEmail: string;
  appUrl: string;
}): EmailResult {
  const label = FEEDBACK_CATEGORY_LABELS[category] ?? category;

  return {
    subject: `New Shefa feedback: ${label}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-top:0">New feedback (${escapeHtml(label)})</h2>
  <p>From <strong>${escapeHtml(submitterEmail)}</strong>:</p>
  <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:12px 16px;color:#374151;background:#f9fafb;white-space:pre-wrap;">
    ${escapeHtml(message)}
  </blockquote>
  <p>
    <a href="${appUrl}/admin" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Open admin
    </a>
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
