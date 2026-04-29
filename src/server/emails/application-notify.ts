interface EmailResult {
  subject: string;
  html: string;
}

export function buildApplicationNotifyEmail({
  jobTitle,
  jobId,
  appUrl,
}: {
  jobTitle: string;
  jobId: string;
  appUrl: string;
}): EmailResult {
  const applicationsUrl = `${appUrl}/employer/jobs/${jobId}/applications`;

  return {
    subject: `New application for "${escapeHtml(jobTitle)}" on Shefa`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-top:0">New application received</h2>
  <p>Someone applied to your job posting <strong>${escapeHtml(jobTitle)}</strong> on Shefa.</p>
  <p>
    <a href="${applicationsUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      View Applications
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="color:#6b7280;font-size:13px;">
    You&rsquo;re receiving this because you have an active job posting on Shefa.
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
