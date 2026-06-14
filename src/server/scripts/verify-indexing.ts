import "dotenv/config";
import { publishUrlNotification, isIndexingConfigured } from "../indexing";
import { getAppUrl } from "../app-url";

/**
 * One-off check that the Google Indexing API credentials actually work end-to-end:
 * mints a service-account token and publishes a real URL_UPDATED notification.
 *
 *   npm run verify:indexing                       # uses <AUTH_URL>/jobs
 *   npm run verify:indexing -- https://site/jobs/<id>   # a specific job URL
 *
 * A 200 proves creds + Search Console ownership + the API being enabled. Publishing is
 * harmless (and legitimate) — Google validates the JobPosting markup asynchronously.
 */
async function main() {
  if (!isIndexingConfigured()) {
    console.error(
      "✗ Indexing creds not found in this environment.\n" +
        "  Set GOOGLE_INDEXING_CLIENT_EMAIL and GOOGLE_INDEXING_PRIVATE_KEY (and run with the right env file).",
    );
    process.exit(1);
  }

  const url = process.argv[2] ?? `${getAppUrl()}/jobs`;
  console.log(`Publishing URL_UPDATED for: ${url}`);

  try {
    await publishUrlNotification(url, "URL_UPDATED");
    console.log("✓ Success — Google accepted the notification. The Indexing API is live.");
  } catch (err) {
    console.error("✗ Failed:\n  ", err instanceof Error ? err.message : err);
    console.error(
      "\nCommon causes:\n" +
        "  • 403 PERMISSION_DENIED / 'Failed to verify the URL ownership' →\n" +
        "      add the service-account email as a verified OWNER in Search Console.\n" +
        "  • 403 'has not been used'/'disabled' →\n" +
        "      enable 'Web Search Indexing API' in the GCP project.\n" +
        "  • 400/401 invalid_grant →\n" +
        "      the private key didn't parse; paste the JSON private_key value with literal \\n newlines.",
    );
    process.exit(1);
  }
}

void main();
