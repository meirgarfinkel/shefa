/**
 * Canonical base URL of the deployment, read once from `AUTH_URL`.
 *
 * All server-side links (verification redirect, freshness/notification emails) must go
 * through here. In production a missing `AUTH_URL` is a hard error — failing the deploy is
 * far better than silently emailing `http://localhost:3000` links to real users. Outside
 * production we fall back to localhost for convenience.
 */
export function getAppUrl(): string {
  const url = process.env.AUTH_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_URL is not set. Set it to the canonical production URL (no trailing slash).",
    );
  }
  return "http://localhost:3000";
}
