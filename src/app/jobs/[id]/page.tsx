"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";

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

const DAY_LABELS: Record<string, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Applied",
  VIEWED: "Viewed",
  RESPONDED: "Responded",
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-surface-3 text-text-muted",
  VIEWED: "bg-warning/15 text-warning border-warning/25",
  RESPONDED: "bg-success/15 text-success border-success/25",
  CLOSED: "bg-danger/15 text-danger border-danger/25",
};

function ApplyDialog({
  jobId,
  jobTitle,
  open,
  onOpenChange,
  onSuccess,
}: {
  jobId: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState("");
  const utils = trpc.useUtils();

  const submit = trpc.application.submit.useMutation({
    onSuccess: () => {
      void utils.application.myStatus.invalidate({ jobId });
      onSuccess();
    },
  });

  const handleSubmit = () => {
    submit.mutate({ jobId, message: message || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
          <DialogDescription>
            Add an optional message to introduce yourself. Keep it brief — 500 chars max.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            placeholder="Tell them a bit about yourself or why you're interested… (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={4}
            className="resize-none"
          />
          <p className="text-text-muted text-right text-xs">{message.length}/500</p>
        </div>

        {submit.error && (
          <p className="text-danger text-sm">
            {submit.error.data?.code === "CONFLICT"
              ? "You already applied to this job."
              : "Something went wrong. Please try again."}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: job, isLoading, error } = trpc.jobPosting.getById.useQuery({ id });
  const { data: myStatus } = trpc.application.myStatus.useQuery(
    { jobId: id },
    { enabled: session?.user?.role === "SEEKER" },
  );
  const { data: seekerProfile, isLoading: seekerProfileLoading } =
    trpc.seeker.getMyProfile.useQuery(undefined, {
      enabled: session?.user?.role === "SEEKER",
    });
  const { data: employerProfile } = trpc.employer.getProfile.useQuery(undefined, {
    enabled: session?.user?.role === "EMPLOYER",
  });

  if (isLoading) {
    return <div className="text-text-muted mx-auto max-w-3xl px-4 py-16 text-center">Loading…</div>;
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-text-muted">This job posting was not found.</p>
        <Button asChild>
          <Link href="/jobs">Back to listings</Link>
        </Button>
      </div>
    );
  }

  const sortedDays = [...job.workDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const isSeeker = session?.user?.role === "SEEKER";
  const isOwner =
    session?.user?.role === "EMPLOYER" && employerProfile?.id === job.employerProfile.id;
  const hasProfile =
    isSeeker && !seekerProfileLoading && seekerProfile !== null && seekerProfile !== undefined;
  const noProfile = isSeeker && !seekerProfileLoading && !seekerProfile;
  const hasApplied = submitted || (myStatus && myStatus.status !== "CLOSED");
  const currentStatus = myStatus?.status;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Back link */}
      <Link
        href="/jobs"
        className="text-text-muted hover:text-text mb-6 inline-flex items-center gap-1 text-sm"
      >
        ← Back to listings
      </Link>

      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle>{job.title}</CardTitle>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="bg-primary hover:bg-success hover:text-surface-1 h-7 gap-1.5 text-xs transition-colors duration-150"
                  >
                    <Link href={`/employer/jobs/${id}/edit`}>
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Link>
                  </Button>
                )}
                <ResponsiveBadge isResponsive={job.employerProfile.isResponsive} isNew={false} />
              </div>
            </div>
            <CardDescription>
              <span>🏢 </span>
              <Link
                href={`/employer/${job.employerProfile.id}`}
                className="hover:text-text font-medium"
              >
                {job.employerProfile.companyName}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Pill>
                <span>
                  📍 {job.city}, {job.state}
                </span>
              </Pill>
              <Pill>
                <span>🕒 {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}</span>
              </Pill>
              <Pill>
                <span>🚗 {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}</span>
              </Pill>
              {job.workAuthRequired && (
                <Pill>
                  <span>✅ Work auth required</span>
                </Pill>
              )}
            </div>

            <Separator />

            {/* Quick facts */}
            <div className="my-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-text-muted text-xs font-medium tracking-wide uppercase">Pay</p>
                <p className="text-text mt-1 text-sm font-medium">
                  From ${Number(job.minHourlyRate).toFixed(2)}/hr
                </p>
                {job.payNotes && <p className="text-text-muted mt-0.5 text-xs">{job.payNotes}</p>}
              </div>

              {sortedDays.length > 0 && (
                <div>
                  <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
                    Work days
                  </p>
                  <p className="text-text mt-1 text-sm">
                    {sortedDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                  </p>
                  {job.scheduleNotes && (
                    <p className="text-text-muted mt-0.5 text-xs">{job.scheduleNotes}</p>
                  )}
                </div>
              )}

              {job.requiredLanguages.length > 0 && (
                <div>
                  <p className="text-text-muted text-xs font-medium tracking-wide uppercase">
                    Languages
                  </p>
                  <p className="text-text mt-1 text-sm">
                    {job.requiredLanguages.map((l) => l.language.name).join(", ")}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-text mb-1 text-sm font-medium">📄 About the role</h2>
              <div className="bg-primary/20 rounded-lg p-4">
                <p className="text-text-muted text-sm">{job.description}</p>
              </div>
            </div>

            {/* Opportunity callouts */}
            {(job.whatWeTeach || job.whatWereLookingFor) && (
              <>
                <div className="my-5 space-y-4">
                  {job.whatWeTeach && (
                    <div>
                      <h2 className="text-text mb-1 text-sm font-medium">
                        🎓 We&apos;ll teach you
                      </h2>
                      <div className="bg-primary/20 rounded-lg p-4">
                        <p className="text-text-muted text-sm">{job.whatWeTeach}</p>
                      </div>
                    </div>
                  )}
                  {job.whatWereLookingFor && (
                    <div>
                      <h2 className="text-text mb-1 text-sm font-medium">
                        🔍 What we&apos;re looking for
                      </h2>
                      <div className="bg-primary/20 rounded-lg p-4">
                        <p className="text-text-muted text-sm">{job.whatWereLookingFor}</p>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Preferred skills */}
            {job.preferredSkills.length > 0 && (
              <>
                <Separator />
                <div className="my-6">
                  <h2 className="text-text mb-3 text-sm font-medium">🛠️ Preferred skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map((ps) => (
                      <span
                        key={ps.skill.id}
                        className="bg-primary/15 text-text rounded-lg px-2.5 py-0.5 text-xs"
                      >
                        {ps.skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Apply CTA */}
            <Separator />
            <div className="mt-8">
              {!isSeeker && (
                <p className="text-text-muted text-sm">Sign in as a job seeker to apply.</p>
              )}

              {noProfile && (
                <p className="text-text-muted text-sm">
                  <Link href="/seeker/profile/new" className="text-primary underline">
                    Complete your seeker profile
                  </Link>{" "}
                  to apply for jobs.
                </p>
              )}

              {hasProfile && !hasApplied && myStatus?.status !== "CLOSED" && (
                <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
                  Apply for this job
                </Button>
              )}

              {hasProfile && hasApplied && currentStatus !== "CLOSED" && (
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      APPLICATION_STATUS_STYLES[currentStatus ?? "SUBMITTED"]
                    }`}
                  >
                    {APPLICATION_STATUS_LABELS[currentStatus ?? "SUBMITTED"]}
                  </span>
                  <Link href="/seeker/applications" className="text-text-muted text-sm underline">
                    View my applications
                  </Link>
                </div>
              )}

              {hasProfile && (myStatus?.status === "CLOSED" || (!myStatus && submitted)) && (
                <div className="space-y-2">
                  {submitted && (
                    <p className="text-success text-sm">
                      Application submitted! The employer will be in touch.
                    </p>
                  )}
                </div>
              )}
            </div>

            {hasProfile && (
              <ApplyDialog
                jobId={id}
                jobTitle={job.title}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={() => {
                  setDialogOpen(false);
                  setSubmitted(true);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
