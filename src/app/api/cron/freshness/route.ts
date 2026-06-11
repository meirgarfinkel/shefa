import { runFreshnessCheck } from "@/server/jobs/freshness.job";
import { verifyCronRequest } from "@/server/cron-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runFreshnessCheck();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron/freshness] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
