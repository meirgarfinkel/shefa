import crypto from "node:crypto";
import { getAppUrl } from "@/server/app-url";

/**
 * Google Indexing API — instant notification when a job posting changes.
 *
 * The Indexing API is officially supported ONLY for pages carrying `JobPosting` or
 * `BroadcastEvent` structured data, which is exactly our use case (see
 * `src/lib/seo/job-posting.ts`). It does NOT replace the sitemap — keep both.
 *
 * Auth is a service-account JWT (no SDK dependency — signed with Node's crypto).
 * Setup: GCP project → enable "Web Search Indexing API" → create a service account +
 * JSON key → in Search Console add the service-account email as a verified Owner of the
 * property. Then set GOOGLE_INDEXING_CLIENT_EMAIL / GOOGLE_INDEXING_PRIVATE_KEY.
 *
 * Fire-and-forget, like the email notifications: a failure is logged, never thrown, and
 * if the env vars are unset the whole thing is a silent no-op (so local/dev is unaffected).
 *
 * Docs: https://developers.google.com/search/apis/indexing-api/v3/using-api
 */

const SCOPE = "https://www.googleapis.com/auth/indexing";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";

export type IndexNotificationType = "URL_UPDATED" | "URL_DELETED";

interface ServiceAccountCreds {
  clientEmail: string;
  privateKey: string;
}

function getCreds(): ServiceAccountCreds | null {
  const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  // Env stores the PEM with literal "\n"; restore real newlines for crypto.
  const privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

/** Absolute URL of a public job page, the unit the Indexing API notifies on. */
export function jobIndexUrl(jobId: string): string {
  return `${getAppUrl()}/jobs/${jobId}`;
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(creds: ServiceAccountCreds): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .sign(creds.privateKey)
    .toString("base64url");
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Indexing API token request failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

/** Whether service-account creds are present (i.e. notifications will actually fire). */
export function isIndexingConfigured(): boolean {
  return getCreds() !== null;
}

/**
 * Throwing core: publish a single URL notification. Throws on missing creds or a non-2xx
 * response (with the API's error body, which carries the actionable message — e.g.
 * "Permission denied" when the service account isn't a Search Console owner). Used by the
 * fire-and-forget wrapper and by the verification script.
 */
export async function publishUrlNotification(
  url: string,
  type: IndexNotificationType,
): Promise<void> {
  const creds = getCreds();
  if (!creds) {
    throw new Error(
      "GOOGLE_INDEXING_CLIENT_EMAIL / GOOGLE_INDEXING_PRIVATE_KEY are not set in this environment",
    );
  }
  const token = await getAccessToken(creds);
  const res = await fetch(PUBLISH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, type }),
  });
  if (!res.ok) {
    throw new Error(`Indexing API publish failed (${res.status}): ${await res.text()}`);
  }
}

/**
 * Notify Google that a job URL was updated or removed. Safe to call inline and
 * un-awaited: no-op when unconfigured, never throws.
 */
export async function notifyGoogleIndex(url: string, type: IndexNotificationType): Promise<void> {
  if (!isIndexingConfigured()) return;
  try {
    await publishUrlNotification(url, type);
  } catch (err) {
    console.error(`Google Indexing notify error (${type}, ${url})`, err);
  }
}
