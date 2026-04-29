interface EmailResult {
  subject: string;
  html: string;
}

export function buildMessageNotifyEmail({
  senderEmail,
  messagePreview,
  conversationId,
  appUrl,
}: {
  senderEmail: string;
  messagePreview: string;
  conversationId: string;
  appUrl: string;
}): EmailResult {
  const conversationUrl = `${appUrl}/messages/${conversationId}`;
  const preview = messagePreview.length > 200 ? messagePreview.slice(0, 200) + "…" : messagePreview;

  return {
    subject: "You have a new message on Shefa",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-top:0">You have a new message</h2>
  <p><strong>${escapeHtml(senderEmail)}</strong> sent you a message on Shefa.</p>
  <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:12px 16px;color:#374151;background:#f9fafb;">
    ${escapeHtml(preview)}
  </blockquote>
  <p>
    <a href="${conversationUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      View Message
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="color:#6b7280;font-size:13px;">
    You&rsquo;re receiving this because you have an active account on Shefa.
    You can change your notification preferences in your account settings.
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
