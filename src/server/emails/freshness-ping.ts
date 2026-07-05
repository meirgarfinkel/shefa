interface EmailResult {
  subject: string;
  html: string;
}

// ── Job posting emails ────────────────────────────────────────────────────────

interface JobTokenUrls {
  confirm: string;
  pause: string;
  filled: string;
}

function formatPauseDate(pauseDate: Date): string {
  return pauseDate.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildJobInitialPingEmail(
  _toEmail: string,
  jobTitle: string,
  urls: JobTokenUrls,
  pauseDate: Date,
): EmailResult {
  return {
    subject: `Is "${jobTitle}" still open? Confirm or close the listing.`,
    html: buildJobHtml({
      headline: `Is "${jobTitle}" still open?`,
      body: "Your listing is currently active on Shefa. Let job seekers know it&rsquo;s still available.",
      urls,
      pauseDate,
    }),
  };
}

export function buildJobWarningEmail(
  _toEmail: string,
  jobTitle: string,
  urls: JobTokenUrls,
  pauseDate: Date,
): EmailResult {
  return {
    subject: `"${jobTitle}" will be paused soon — please confirm`,
    html: buildJobHtml({
      headline: `"${jobTitle}" will be paused soon`,
      body: "We haven&rsquo;t received a response. Confirm the listing is still open, or it will be paused automatically.",
      urls,
      pauseDate,
    }),
  };
}

function buildJobHtml({
  headline,
  body,
  urls,
  pauseDate,
}: {
  headline: string;
  body: string;
  urls: JobTokenUrls;
  pauseDate: Date;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-top:0">${headline}</h2>
  <p>${body}</p>
  <p>
    <a href="${urls.confirm}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Yes, still accepting applicants
    </a>
  </p>
  <p>
    <a href="${urls.pause}" style="display:inline-block;background:#6b7280;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Pause this listing
    </a>
  </p>
  <p>
    <a href="${urls.filled}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Job has been filled
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="color:#b45309;font-size:14px;font-weight:600;">
    If we don&rsquo;t hear from you by ${formatPauseDate(pauseDate)}, this listing will be
    paused automatically. You can reactivate it anytime.
  </p>
  <p style="color:#6b7280;font-size:13px;">
    You&rsquo;re receiving this because you posted a listing on Shefa.
    These verification emails cannot be turned off — they keep the platform fresh for job seekers.
  </p>
</body>
</html>`;
}
