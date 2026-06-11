import { type NextRequest, NextResponse } from "next/server";
import { redeemToken } from "@/server/jobs/redeem";
import { getAppUrl } from "@/server/app-url";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  const result = await redeemToken(token);
  const appUrl = getAppUrl();

  switch (result.status) {
    case "success":
      return NextResponse.redirect(new URL("/verify/confirmed", appUrl));
    case "expired":
      return NextResponse.redirect(new URL("/verify/expired", appUrl));
    case "already-used":
      return NextResponse.redirect(new URL("/verify/already-used", appUrl));
    case "invalid":
      return NextResponse.redirect(new URL("/verify/invalid", appUrl));
  }
}
