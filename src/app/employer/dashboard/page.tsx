"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployerDashboardPage() {
  const router = useRouter();

  const { data: profile } = trpc.employer.getProfile.useQuery();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Employer Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your jobs and company profile</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => router.push("/employer/jobs/new")}>+ Post a job</Button>
        <Button variant="outline" onClick={() => router.push("/employer/jobs")}>
          View my jobs
        </Button>
        <Button variant="outline" onClick={() => router.push("/employer/profile/new")}>
          Edit company profile
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {profile?.activeJobsCount ?? 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{profile?.companyName ?? "—"}</CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>

        <div className="text-muted-foreground rounded-lg border p-6 text-sm">
          No recent activity yet.
        </div>
      </div>
    </div>
  );
}
