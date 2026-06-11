import { timingSafeEqual } from "crypto";

/**
 * Verify a Vercel Cron request's bearer token against `CRON_SECRET`.
 *
 * Fails closed: if `CRON_SECRET` is unset we reject every request, rather than comparing
 * against the literal string "Bearer undefined" (which would let anyone trigger the job).
 * Uses a constant-time compare to avoid leaking the secret via timing.
 */
export function verifyCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (!header) return false;

  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so guard first (length is not secret).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
