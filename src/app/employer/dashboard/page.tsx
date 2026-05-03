"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";

export default function EmployerDashboardPage() {
  const router = useRouter();
  const { data: profile } = trpc.employer.getProfile.useQuery();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader
        title="Dashboard"
        description="Manage your jobs and company profile."
        actions={<Button onClick={() => router.push("/employer/jobs/new")}>Post a job</Button>}
      />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Active jobs" value={profile?.activeJobsCount ?? 0} />
        <StatCard label="Company" value={profile?.companyName ?? "—"} />
      </div>

      <div>
        <h2 className="text-text mb-3 font-medium">Recent activity</h2>
        <div className="bg-surface-1 text-text-muted rounded-lg p-6 text-sm">
          No recent activity yet.
        </div>
      </div>
    </div>
  );
}
