"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Surface } from "@/components/ui/surface";
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
import { JOB_TYPE_LABELS, ARRANGEMENT_LABELS, DAY_LABELS, DAY_ORDER } from "@/lib/constants/labels";

type JobDetail = inferRouterOutputs<AppRouter>["jobPosting"]["getById"];

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Applied",
  VIEWED: "Viewed",
  REJECTED: "Not selected",
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-white text-success",
  VIEWED: "bg-warning/15 text-orange",
  REJECTED: "bg-danger/15 text-danger",
  CLOSED: "bg-blue-dark-3 text-white",
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
          <p className="text-right text-xs">{message.length}/500</p>
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

export function JobDetailClient({ id, initialJob }: { id: string; initialJob: JobDetail }) {
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applicationJustSubmitted, setApplicationJustSubmitted] = useState(false);

  // Seeded with the server-fetched job so the SSR content is present immediately and the
  // page never flashes a loading state; the query keeps it fresh on the client.
  const { data: job, error } = trpc.jobPosting.getById.useQuery(
    { id },
    { initialData: initialJob },
  );
  const { data: myStatus } = trpc.application.myStatus.useQuery(
    { jobId: id },
    { enabled: session?.user?.role === "SEEKER" },
  );
  const { data: seekerProfile, isLoading: seekerProfileLoading } =
    trpc.seeker.getMyProfile.useQuery(undefined, {
      enabled: session?.user?.role === "SEEKER",
    });

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>This job posting was not found.</p>
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
  const currentStatus = myStatus?.status;

  const applicationClosed = currentStatus === "CLOSED";

  const hasApplied = applicationJustSubmitted || (!!currentStatus && currentStatus !== "CLOSED");

  const canApply = hasProfile && !hasApplied && !applicationClosed;

  const showApplicationStatus = hasProfile && hasApplied && !applicationClosed;

  return (
    <div className="p-5">
      <div className="mx-auto max-w-2xl">
        <Link href="/jobs" className="hover:text-orange">
          ← Back to listings
        </Link>

        <Panel className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle>{job.title}</CardTitle>
            <div className="flex items-center gap-2">
              <ResponsiveBadge
                isResponsive={job.business.employer.isResponsive}
                isNew={job.business.employer.isNew}
              />
              {isOwner && (
                <Button asChild size="sm" className="gap-1 text-sm">
                  <Link href={`/employer/jobs/${id}/edit`}>
                    <Pencil className="text-message-green size-4" strokeWidth={2.5} />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <Link
              href={`/business/${job.business.id}`}
              className="hover:text-orange flex items-center gap-1 font-medium"
            >
              <Building className="text-message-green size-4" strokeWidth={2.5} />
              {job.business.name}
            </Link>
          </div>

          <CardContent>
            <div className="relative mt-5 flex flex-wrap gap-2">
              <Pill variant="light">
                <div className="flex items-center gap-1">
                  <MapPin className="text-message-green size-4" strokeWidth={2.5} /> {job.city},{" "}
                  {job.state}
                </div>
              </Pill>
              <Pill variant="light">
                <div className="flex items-center gap-1">
                  <Clock className="text-message-green size-4" strokeWidth={2.5} />
                  {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                </div>
              </Pill>
              <Pill variant="light">
                <div className="flex items-center gap-1">
                  <Car className="text-message-green size-4" strokeWidth={2.5} />
                  {ARRANGEMENT_LABELS[job.workArrangement] ?? job.workArrangement}
                </div>
              </Pill>
              {job.workAuthRequired && (
                <Pill variant="light">
                  <div className="flex items-center gap-1">
                    <Check className="text-message-green size-4" strokeWidth={2.5} />
                    Work auth required
                  </div>
                </Pill>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-md font-medium tracking-wide">Pay</p>
                <p className="text-muted mt-1 text-sm font-medium">
                  From ${Number(job.minHourlyRate).toFixed(2)}/hr
                </p>
                {job.payNotes && <p className="text-muted mt-0.5 text-xs">{job.payNotes}</p>}
              </div>

              {sortedDays.length > 0 && (
                <div>
                  <p className="text-md font-medium tracking-wide">Work days</p>
                  <p className="text-muted mt-1 text-sm font-medium">
                    {sortedDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                  </p>
                  {job.scheduleNotes && (
                    <p className="text-muted mt-0.5 text-xs">{job.scheduleNotes}</p>
                  )}
                </div>
              )}

              {job.requiredLanguages.length > 0 && (
                <div>
                  <p className="text-md font-medium tracking-wide">Languages</p>
                  <p className="text-muted mt-1 text-sm font-medium">
                    {job.requiredLanguages.map((l) => l.language.name).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-8 space-y-1">
              <div className="flex items-center gap-1 font-medium">
                <Info className="text-message-green size-4" strokeWidth={2.5} />
                About the role
              </div>
              <Surface className="shadow-xl">{job.description}</Surface>
            </div>

            {job.whatWereLookingFor && (
              <div className="mt-8 space-y-1">
                <div className="mb-1 flex items-center gap-1 font-medium">
                  <SearchCheck className="text-message-green size-4" strokeWidth={2.5} />
                  What we&apos;re looking for
                </div>
                <Surface className="shadow-xl">{job.whatWereLookingFor}</Surface>
              </div>
            )}

            {/* Apply CTA */}
            <div className="mt-8 space-y-2">
              {noProfile && (
                <p className="text-muted text-sm">
                  <Link href="/seeker/profile/new" className="text-primary underline">
                    Complete your seeker profile
                  </Link>{" "}
                  to apply for jobs.
                </p>
              )}

              {!isSeeker && <p className="text-muted text-sm">Sign in as a job seeker to apply.</p>}

              {canApply && (
                <Button className="mt-8" onClick={() => setDialogOpen(true)}>
                  Apply for this job
                </Button>
              )}

              {showApplicationStatus && (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
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

              {applicationJustSubmitted && (
                <p className="text-success text-sm">
                  Application submitted! The employer will be in touch.
                </p>
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
                  setApplicationJustSubmitted(true);
                }}
              />
            )}
          </CardContent>
        </Panel>
      </div>
    </div>
  );
}
