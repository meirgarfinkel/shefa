import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { verificationTokens, users } from "@/db/schema";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/sign-in?error=InvalidToken`);
  }

  const record = await db.query.verificationTokens.findFirst({
    where: eq(verificationTokens.token, token),
  });

  if (!record || !record.identifier.startsWith("email_change:")) {
    return NextResponse.redirect(`${origin}/sign-in?error=InvalidToken`);
  }

  if (record.expires < new Date()) {
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
    return NextResponse.redirect(`${origin}/sign-in?error=TokenExpired`);
  }

  // identifier format: "email_change:{userId}:{newEmail}"
  const withoutPrefix = record.identifier.slice("email_change:".length);
  const colonIdx = withoutPrefix.indexOf(":");
  const userId = withoutPrefix.slice(0, colonIdx);
  const newEmail = withoutPrefix.slice(colonIdx + 1);

  await db.update(users).set({ email: newEmail }).where(eq(users.id, userId));
  await db.delete(verificationTokens).where(eq(verificationTokens.token, token));

  return NextResponse.redirect(`${origin}/?emailChanged=1`);
}
