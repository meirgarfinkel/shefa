import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/sign-in?error=InvalidToken`);
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || !record.identifier.startsWith("email_change:")) {
    return NextResponse.redirect(`${origin}/sign-in?error=InvalidToken`);
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.redirect(`${origin}/sign-in?error=TokenExpired`);
  }

  // identifier format: "email_change:{userId}:{newEmail}"
  const withoutPrefix = record.identifier.slice("email_change:".length);
  const colonIdx = withoutPrefix.indexOf(":");
  const userId = withoutPrefix.slice(0, colonIdx);
  const newEmail = withoutPrefix.slice(colonIdx + 1);

  await prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(`${origin}/?emailChanged=1`);
}
