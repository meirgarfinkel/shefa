"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  EITHER: "Full or Part-time",
};

const ARRANGEMENT_LABELS: Record<string, string> = {
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export default function JobsPage() {
  const { data: session } = useSession();
  const { data: jobs, isLoading } = trpc.jobPosting.list.useQuery({});

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job listings</h1>
          <p className="text-muted-foreground mt-1">
            Entry-level roles at employers who invest in their people.
          </p>
        </div>
        {session?.user?.role === "EMPLOYER" && (
          <Button asChild>
            <Link href="/employer/jobs/new">Post a job</Link>
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="text-muted-foreground py-16 text-center">Loading listings…</div>
      )}

      {!isLoading && jobs?.length === 0 && (
        <div className="text-muted-foreground py-16 text-center">
          No open positions yet. Check back soon.
        </div>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <p className="text-muted-foreground text-sm font-medium">
                  {job.employerProfile.companyName}
                </p>
                <CardTitle className="text-lg leading-snug">{job.title}</CardTitle>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {/* Location + type chips */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {job.city}, {job.state}
                  </span>
                  <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                  </span>
                  <span className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
                  </span>
                </div>

                {/* Pay */}
                <p className="text-sm font-medium">
                  From ${Number(job.minHourlyRate).toFixed(2)}/hr
                </p>

                {/* Description snippet */}
                <p className="text-muted-foreground line-clamp-3 text-sm">{job.description}</p>

                {/* What we teach callout */}
                {job.whatWeTeach && (
                  <p className="text-sm">
                    <span className="font-medium">We&apos;ll teach you: </span>
                    <span className="text-muted-foreground line-clamp-2">{job.whatWeTeach}</span>
                  </p>
                )}
              </CardContent>

              <CardFooter className="pt-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/jobs/${job.id}`}>View job</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
