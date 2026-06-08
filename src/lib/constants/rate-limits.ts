// Abuse rate limits, enforced as rolling-window row counts in tRPC mutations.
// See application.submit (apply cap) and conversation.create (cold-DM cap).

export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Max applications a seeker may submit per rolling 24h window. */
export const APPLICATIONS_PER_DAY = 25;

/** Max cold DMs (employer-initiated, no job context) per rolling 24h window. */
export const COLD_DMS_PER_DAY = 50;

/** Timestamp marking the start of the current rolling window. */
export function rateLimitWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
}
