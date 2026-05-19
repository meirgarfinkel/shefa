import { runResponsivenessJob } from "@/server/jobs/responsiveness.job";
import { NextResponse } from "next/server";

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runResponsivenessJob();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron/responsiveness] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
