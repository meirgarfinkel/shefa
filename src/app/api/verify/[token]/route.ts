import { type NextRequest, NextResponse } from "next/server";
import { redeemToken } from "@/server/jobs/redeem";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  const result = await redeemToken(token);

  switch (result.status) {
    case "success":
      return NextResponse.redirect(new URL("/verify/confirmed", process.env.AUTH_URL!));
    case "expired":
      return NextResponse.redirect(new URL("/verify/expired", process.env.AUTH_URL!));
    case "already-used":
      return NextResponse.redirect(new URL("/verify/already-used", process.env.AUTH_URL!));
    case "invalid":
      return NextResponse.redirect(new URL("/verify/invalid", process.env.AUTH_URL!));
  }
}
