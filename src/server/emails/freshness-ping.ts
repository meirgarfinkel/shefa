interface EmailResult {
  subject: string;
  html: string;
}

// ── Seeker emails ─────────────────────────────────────────────────────────────

interface SeekerTokenUrls {
  confirm: string;
  pause: string;
  notLooking: string;
}

export function buildSeekerInitialPingEmail(_toEmail: string, urls: SeekerTokenUrls): EmailResult {
  return {
    subject: "Are you still looking for work? Confirm your profile is active.",
    html: buildSeekerHtml({
      headline: "Are you still looking for work?",
      body: "Your Shefa profile is currently active. Let us know so employers can still find you.",
      urls,
    }),
  };
}

export function buildSeekerWarningEmail(_toEmail: string, urls: SeekerTokenUrls): EmailResult {
  return {
    subject: "Your profile will be paused in 8 days — please confirm",
    html: buildSeekerHtml({
      headline: "Your profile will be paused soon",
      body: "We haven't heard from you in a while. Confirm you're still looking or your profile will be paused automatically in 8 days.",
      urls,
    }),
  };
}

function buildSeekerHtml({
  headline,
  body,
  urls,
}: {
  headline: string;
  body: string;
  urls: SeekerTokenUrls;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;">
  <h2 style="margin-top:0">${headline}</h2>
  <p>${body}</p>
  <p>
    <a href="${urls.confirm}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Yes, I&rsquo;m still looking
    </a>
  </p>
  <p>
    <a href="${urls.pause}" style="display:inline-block;background:#6b7280;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Pause my profile (I&rsquo;ll be back)
    </a>
  </p>
  <p>
    <a href="${urls.notLooking}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      No, I&rsquo;m no longer looking
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
  <p style="color:#6b7280;font-size:13px;">
    You&rsquo;re receiving this because you have an active job-seeker profile on Shefa.
    These verification emails cannot be turned off — they keep listings fresh for everyone.
  </p>
</body>
</html>`;
}

// ── Job posting emails ────────────────────────────────────────────────────────

interface JobTokenUrls {
  confirm: string;
  pause: string;
  filled: string;
}

export function buildJobInitialPingEmail(
  _toEmail: string,
  jobTitle: string,
  urls: JobTokenUrls,
): EmailResult {
  return {
    subject: `Is "${jobTitle}" still open? Confirm or close the listing.`,
    html: buildJobHtml({
      headline: `Is "${jobTitle}" still open?`,
      body: "Your listing is currently active on Shefa. Let job seekers know it&rsquo;s still available.",
      jobTitle,
      urls,
    }),
  };
}

export function buildJobWarningEmail(
  _toEmail: string,
  jobTitle: string,
  urls: JobTokenUrls,
): EmailResult {
  return {
    subject: `"${jobTitle}" will be paused in 8 days — please confirm`,
    html: buildJobHtml({
      headline: `"${jobTitle}" will be paused soon`,
      body: "We haven&rsquo;t received a response. Confirm the listing is still open or it will be paused automatically in 8 days.",
      jobTitle,
      urls,
    }),
  };
}

function buildJobHtml({
  headline,
  body,
  urls,
}: {
  headline: string;
  body: string;
  jobTitle: string;
  urls: JobTokenUrls;
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
  <p style="color:#6b7280;font-size:13px;">
    You&rsquo;re receiving this because you posted a listing on Shefa.
    These verification emails cannot be turned off — they keep the platform fresh for job seekers.
  </p>
</body>
</html>`;
}
