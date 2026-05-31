"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil, Building, Car, Clock, MapPin, Info, Check, SearchCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  REJECTED: "Not selected",
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-dark-3 text-muted-foreground",
  VIEWED: "bg-warning/15 text-warning",
  REJECTED: "bg-danger/15 text-danger",
  CLOSED: "bg-blue-dark-3 text-muted-foreground",
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
          <DialogDescription>Add an optional message to introduce yourself.</DialogDescription>
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
          <p className="text-danger text-sm">
            {submit.error.data?.code === "CONFLICT"
              ? "You already applied to this job."
              : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="flex justify-between">
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit application"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            Cancel
          </Button>
        </div>
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

  if (isLoading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-3xl px-3 py-16 text-center">Loading…</div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">This job posting was not found.</p>
        <Button asChild className="text-foreground">
          <Link href="/jobs">Back to listings</Link>
        </Button>
      </div>
    );
  }

  const sortedDays = [...job.workDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const isSeeker = session?.user?.role === "SEEKER";
  const isOwner = session?.user?.role === "EMPLOYER" && session.user.id === job.employerId;
  const hasProfile =
    isSeeker && !seekerProfileLoading && seekerProfile !== null && seekerProfile !== undefined;
  const noProfile = isSeeker && !seekerProfileLoading && !seekerProfile;
  const hasApplied = submitted || (myStatus && myStatus.status !== "CLOSED");
  const currentStatus = myStatus?.status;

  return (
    <div className="p-5">
      <div className="mx-auto max-w-2xl">
        <Link href="/jobs" className="hover:text-orange">
          ← Back to listings
        </Link>

        <div className="bg-card/30 mt-5 rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle>{job.title}</CardTitle>
            <div className="flex items-center gap-2">
              {isOwner && (
                <Button asChild size="sm">
                  <Link href={`/employer/jobs/${id}/edit`}>
                    <Pencil className="text-message-green mr-1 size-4" strokeWidth={2.5} />
                    Edit
                  </Link>
                </Button>
              )}
              <ResponsiveBadge
                isResponsive={job.company.owner.employerProfile?.isResponsive ?? false}
                isNew={false}
              />
            </div>
          </div>
          <div className="my-5">
            <Link
              href={`/company/${job.company.id}`}
              className="hover:text-orange flex items-center font-medium"
            >
              <Building className="text-message-green mr-1 size-4" strokeWidth={2.5} />
              {job.company.name}
            </Link>
          </div>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Pill className="text-popover bg-white/40">
                <div className="flex items-center">
                  <MapPin className="text-message-green mr-1 size-4" strokeWidth={2.5} /> {job.city}
                  , {job.state}
                </div>
              </Pill>
              <Pill className="text-popover bg-white/40">
                <div className="flex items-center">
                  <Clock className="text-message-green mr-1 size-4" strokeWidth={2.5} />
                  {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                </div>
              </Pill>
              <Pill className="text-popover bg-white/40">
                <div className="flex items-center">
                  <Car className="text-message-green mr-1 size-4" strokeWidth={2.5} />
                  {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
                </div>
              </Pill>
              {job.workAuthRequired && (
                <Pill className="text-popover bg-white/40">
                  <div className="flex items-center">
                    <Check className="text-message-green mr-1 size-4" strokeWidth={2.5} />
                    Work auth required
                  </div>
                </Pill>
              )}
            </div>

            <div className="my-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  Pay
                </p>
                <p className="text-muted mt-1 text-sm font-medium">
                  From ${Number(job.minHourlyRate).toFixed(2)}/hr
                </p>
                {job.payNotes && <p className="text-muted mt-0.5 text-xs">{job.payNotes}</p>}
              </div>

              {sortedDays.length > 0 && (
                <div>
                  <p className="text-sm font-medium tracking-wide uppercase">Work days</p>
                  <p className="text-popover mt-1 text-sm">
                    {sortedDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                  </p>
                  {job.scheduleNotes && (
                    <p className="text-muted mt-0.5 text-xs">{job.scheduleNotes}</p>
                  )}
                </div>
              )}

              {job.requiredLanguages.length > 0 && (
                <div>
                  <p className="text-muted text-xs font-medium tracking-wide uppercase">
                    Languages
                  </p>
                  <p className="mt-1 text-sm">
                    {job.requiredLanguages.map((l) => l.language.name).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex items-center font-medium">
              <Info className="text-message-green mr-1 size-4" strokeWidth={2.5} />
              About the role
            </div>
            <div className="rounded-sm bg-white/40 p-4 shadow-xl">{job.description}</div>

            {job.whatWereLookingFor && (
              <>
                <div className="mt-5 flex items-center font-medium">
                  <SearchCheck className="text-message-green mr-1 size-4" strokeWidth={2.5} />
                  What we&apos;re looking for
                </div>
                <div className="rounded-sm bg-white/40 p-4 shadow-xl">{job.whatWereLookingFor}</div>
              </>
            )}

            {/* Apply CTA */}
            <Separator />
            <div className="mt-8">
              {!isSeeker && <p className="text-muted text-sm">Sign in as a job seeker to apply.</p>}

              {noProfile && (
                <p className="text-muted text-sm">
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
                    className={`rounded-full px-3 py-1 text-sm font-medium text-white ${
                      APPLICATION_STATUS_STYLES[currentStatus ?? "SUBMITTED"]
                    }`}
                  >
                    {APPLICATION_STATUS_LABELS[currentStatus ?? "SUBMITTED"]}
                  </span>
                  <Link
                    href="/seeker/applications"
                    className="text-muted hover:text-orange text-sm underline"
                  >
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
        </div>
      </div>
    </div>
  );
}
