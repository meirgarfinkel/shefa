"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  CLOSED: "Withdrawn",
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  VIEWED: "bg-yellow-100 text-yellow-800",
  RESPONDED: "bg-green-100 text-green-800",
  CLOSED: "bg-muted text-muted-foreground",
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
          <p className="text-muted-foreground text-right text-xs">{message.length}/500</p>
        </div>

        {submit.error && (
          <p className="text-sm text-red-600">
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
  const router = useRouter();
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: job, isLoading, error } = trpc.jobPosting.getById.useQuery({ id });
  const { data: myStatus } = trpc.application.myStatus.useQuery(
    { jobId: id },
    { enabled: session?.user?.role === "SEEKER" },
  );

  const withdraw = trpc.application.withdraw.useMutation({
    onSuccess: () => {
      setSubmitted(false);
    },
  });
  const utils = trpc.useUtils();

  const handleWithdraw = (applicationId: string) => {
    withdraw.mutate(
      { id: applicationId },
      { onSuccess: () => void utils.application.myStatus.invalidate({ jobId: id }) },
    );
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-16 text-center">Loading…</div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">This job posting was not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/jobs")}>
          Back to listings
        </Button>
      </div>
    );
  }

  const sortedDays = [...job.workDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const isSeeker = session?.user?.role === "SEEKER";
  const hasApplied = submitted || (myStatus && myStatus.status !== "CLOSED");
  const currentStatus = myStatus?.status;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Back link */}
      <Link
        href="/jobs"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        ← Back to listings
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <p className="text-muted-foreground text-sm font-medium">
          {job.employerProfile.companyName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{job.title}</h1>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {job.city}, {job.state}
          </span>
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          </span>
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
          </span>
          {job.workAuthRequired && (
            <span className="bg-muted rounded-full px-3 py-1 text-sm">Work auth required</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Quick facts */}
      <div className="my-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Pay</p>
          <p className="mt-1 text-sm font-semibold">
            From ${Number(job.minHourlyRate).toFixed(2)}/hr
          </p>
          {job.payNotes && <p className="text-muted-foreground mt-0.5 text-xs">{job.payNotes}</p>}
        </div>

        {sortedDays.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Work days
            </p>
            <p className="mt-1 text-sm">{sortedDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}</p>
            {job.scheduleNotes && (
              <p className="text-muted-foreground mt-0.5 text-xs">{job.scheduleNotes}</p>
            )}
          </div>
        )}

        {job.requiredLanguages.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Languages
            </p>
            <p className="mt-1 text-sm">
              {job.requiredLanguages.map((l) => l.language.name).join(", ")}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Opportunity callouts */}
      {(job.whatWeTeach || job.whatWereLookingFor) && (
        <>
          <div className="my-6 space-y-4">
            {job.whatWeTeach && (
              <div className="rounded-lg border p-4">
                <h2 className="mb-1 text-sm font-semibold">We&apos;ll teach you</h2>
                <p className="text-muted-foreground text-sm">{job.whatWeTeach}</p>
              </div>
            )}
            {job.whatWereLookingFor && (
              <div className="rounded-lg border p-4">
                <h2 className="mb-1 text-sm font-semibold">What we&apos;re looking for</h2>
                <p className="text-muted-foreground text-sm">{job.whatWereLookingFor}</p>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Description */}
      <div className="my-6">
        <h2 className="mb-3 text-lg font-semibold">About the role</h2>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{job.description}</p>
      </div>

      {/* Preferred skills */}
      {job.preferredSkills.length > 0 && (
        <>
          <Separator />
          <div className="my-6">
            <h2 className="mb-3 text-sm font-semibold">Preferred skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.preferredSkills.map((ps) => (
                <span key={ps.skill.id} className="bg-muted rounded-full px-3 py-1 text-sm">
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
          <p className="text-muted-foreground text-sm">Sign in as a job seeker to apply.</p>
        )}

        {isSeeker && !hasApplied && (
          <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
            Apply for this job
          </Button>
        )}

        {isSeeker && hasApplied && currentStatus !== "CLOSED" && (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                APPLICATION_STATUS_STYLES[currentStatus ?? "SUBMITTED"]
              }`}
            >
              {APPLICATION_STATUS_LABELS[currentStatus ?? "SUBMITTED"]}
            </span>
            {myStatus?.id && currentStatus === "SUBMITTED" && (
              <Button
                variant="outline"
                size="sm"
                disabled={withdraw.isPending}
                onClick={() => handleWithdraw(myStatus.id)}
              >
                {withdraw.isPending ? "Withdrawing…" : "Withdraw"}
              </Button>
            )}
            <Link href="/seeker/applications" className="text-muted-foreground text-sm underline">
              View my applications
            </Link>
          </div>
        )}

        {isSeeker && (myStatus?.status === "CLOSED" || (!myStatus && submitted)) && (
          <div className="space-y-2">
            {submitted && (
              <p className="text-sm text-green-700">
                Application submitted! The employer will be in touch.
              </p>
            )}
            {myStatus?.status === "CLOSED" && (
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                  Withdrawn
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setDialogOpen(true);
                  }}
                >
                  Re-apply
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {isSeeker && (
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
    </div>
  );
}
