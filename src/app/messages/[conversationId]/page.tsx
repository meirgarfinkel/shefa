"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";
import type { JobStatus } from "@/db/schema";
import { Building, Car, Check, Clock, Info, MapPin, SearchCheck } from "lucide-react";

const MAX_BODY = 5000;

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

type ConvJob = {
  id: string;
  title: string;
  status: JobStatus;
  city: string;
  state: string;
  jobType: string;
  workArrangement: string;
  workAuthRequired: boolean;
  minHourlyRate: string | number | { toString(): string };
  payNotes: string | null;
  workDays: string[];
  scheduleNotes: string | null;
  description: string;
  whatWereLookingFor: string | null;
  company: {
    id: string;
    name: string;
    employer: { isResponsive: boolean; isNew: boolean };
  };
  requiredLanguages: { language: { name: string } }[];
};

function JobDetailCard({ job }: { job: ConvJob }) {
  const sortedDays = [...job.workDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  return (
    <div className="bg-card/30 rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle>{job.title}</CardTitle>
        <ResponsiveBadge
          isResponsive={job.company.employer.isResponsive}
          isNew={job.company.employer.isNew}
        />
      </div>
      <CardDescription>
        <div className="my-5">
          <Link
            href={`/company/${job.company.id}`}
            className="hover:text-orange flex items-center gap-1 font-medium"
          >
            <Building className="text-message-green size-4" strokeWidth={2.5} />
            {job.company.name}
          </Link>
        </div>
      </CardDescription>
      <CardContent>
        <div className="flex flex-wrap gap-2">
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

        <div className="my-6 grid grid-cols-2 gap-4">
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

        <div>
          <div className="mb-1 flex items-center gap-1 font-medium">
            <Info className="text-message-green size-4" strokeWidth={2.5} />
            About the role
          </div>
          <div className="rounded-sm bg-white/70 p-3 text-sm shadow-xl">{job.description}</div>
        </div>

        {job.whatWereLookingFor && (
          <div className="my-8">
            <div className="mb-1 flex items-center gap-1 font-medium">
              <SearchCheck className="text-message-green size-4" strokeWidth={2.5} />
              What we&apos;re looking for
            </div>
            <div className="rounded-sm bg-white/70 p-3 text-sm shadow-xl">
              {job.whatWereLookingFor}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground w-full">
            <Link href={`/jobs/${job.id}`}>View full listing ↗</Link>
          </Button>
        </div>
      </CardContent>
    </div>
  );
}

function displayName(
  participant: {
    id: string;
    seekerProfile: { id: string; firstName: string; lastName: string } | null;
    companies: { id: string; name: string }[];
  } | null,
): string {
  if (!participant) return "Unknown";
  if (participant.companies.length > 0) return participant.companies[0]!.name;
  if (participant.seekerProfile)
    return `${participant.seekerProfile.firstName} ${participant.seekerProfile.lastName}`;
  return "Unknown";
}

function profileHref(
  participant: {
    id: string;
    seekerProfile: { id: string } | null;
    companies: { id: string }[];
  } | null,
): string | null {
  if (!participant) return null;
  if (participant.seekerProfile) return `/seeker/${participant.seekerProfile.id}`;
  if (participant.companies.length > 0) return `/employer/${participant.companies[0]!.id}`;
  return null;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { data: session } = useSession();
  const callerId = session?.user?.id;

  const [body, setBody] = useState("");
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: conv,
    isLoading,
    error,
    refetch,
  } = trpc.conversation.get.useQuery({ conversationId });

  const utils = trpc.useUtils();

  const markRead = trpc.conversation.markRead.useMutation();

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setBody("");
      void refetch();
    },
  });

  const blockConv = trpc.conversation.block.useMutation({
    onSuccess: () => void utils.conversation.get.invalidate({ conversationId }),
  });

  const unblockConv = trpc.conversation.unblock.useMutation({
    onSuccess: () => void utils.conversation.get.invalidate({ conversationId }),
  });

  const report = trpc.report.submit.useMutation();

  useEffect(() => {
    if (conv) {
      markRead.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  if (isLoading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-2xl px-4 py-16 text-center">Loading…</div>
    );
  }

  if (error || !conv) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Conversation not found.</p>
        <Button variant="light" className="mt-4" asChild>
          <Link href="/messages">Back to messages</Link>
        </Button>
      </div>
    );
  }

  const callerIsSeeker = conv.seeker.id === callerId;
  const callerBlocked = callerIsSeeker ? conv.seekerBlocked : conv.employerBlocked;

  // Priority-ordered block reason — first match wins for display
  const seekerProfileStatus = conv.seeker.seekerProfile?.status;
  const employerProfileStatus = conv.employer.employerProfile?.status;
  const callerProfileStatus = callerIsSeeker ? seekerProfileStatus : employerProfileStatus;
  const otherProfileStatus = callerIsSeeker ? employerProfileStatus : seekerProfileStatus;

  const blockReason: string | null = (() => {
    if (seekerProfileStatus === "SUSPENDED" || employerProfileStatus === "SUSPENDED")
      return "suspended";
    if (callerProfileStatus === "PAUSED") return "own-profile-paused";
    if (conv.applicationStatus === "REJECTED" || conv.applicationStatus === "CLOSED")
      return "application-closed";
    if (conv.job?.status === "CLOSED") return "job-closed";
    if (conv.seekerBlocked || conv.employerBlocked)
      return callerBlocked ? "caller-blocked" : "other-blocked";
    if (conv.job?.status === "PAUSED") return "job-paused";
    if (otherProfileStatus === "PAUSED") return "other-profile-paused";
    return null;
  })();

  const blockMessage: string | null = (() => {
    switch (blockReason) {
      case "suspended":
        return "This conversation is unavailable.";
      case "own-profile-paused":
        return callerIsSeeker
          ? "Your profile is paused. Reactivate it to send messages."
          : "Your profile is paused. Reactivate it to send messages.";
      case "application-closed":
        return conv.applicationStatus === "REJECTED"
          ? "This application was not selected. Messaging has been disabled."
          : "This application is closed. Messaging has been disabled.";
      case "job-closed":
        return "This job is no longer open. Messaging has been disabled.";
      case "caller-blocked":
        return "You have blocked this conversation.";
      case "other-blocked":
        return "This conversation is blocked.";
      case "job-paused":
        return "This job is currently paused. Messaging may resume if the employer reactivates it.";
      case "other-profile-paused":
        return callerIsSeeker
          ? "The employer's profile is currently paused."
          : "The seeker's profile is currently paused.";
      default:
        return null;
    }
  })();

  const other = callerIsSeeker ? conv.employer : conv.seeker;
  const otherName = displayName(other);
  const otherHref = profileHref(other);

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ conversationId, body: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-start gap-6">
        {/* Job card — desktop only, sticky sidebar */}
        {conv.job && (
          <div className="hidden w-80 shrink-0 lg:block">
            <div
              className="sticky top-6 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 3rem)" }}
            >
              <JobDetailCard job={conv.job} />
            </div>
          </div>
        )}

        {/* Conversation panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/messages" className="hover:text-orange text-sm">
                ← Messages
              </Link>
              <Separator orientation="vertical" className="h-4" />
              <div>
                {otherHref ? (
                  <Link href={otherHref} className="font-medium hover:underline">
                    {otherName}
                  </Link>
                ) : (
                  <span className="font-medium">{otherName}</span>
                )}
                {conv.job && (
                  <p className="text-muted-foreground text-xs">
                    Re:{" "}
                    <Link href={`/jobs/${conv.job.id}`} className="capitalize hover:underline">
                      {conv.job.title}
                    </Link>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile: view job button */}
              {conv.job && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground lg:hidden"
                  onClick={() => setJobModalOpen(true)}
                >
                  View job
                </Button>
              )}

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {callerBlocked ? (
                    <DropdownMenuItem
                      onClick={() => unblockConv.mutate({ conversationId })}
                      disabled={unblockConv.isPending}
                    >
                      Unblock
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => blockConv.mutate({ conversationId })}
                      disabled={blockConv.isPending}
                    >
                      Block
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() =>
                      report.mutate({
                        targetType: "USER",
                        targetId: other?.id ?? "",
                        reason: "Reported from conversation",
                      })
                    }
                    disabled={report.isPending}
                  >
                    Report user
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="mb-4 min-h-[300px] space-y-3">
            {conv.messages.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No messages yet. Say hello!
              </p>
            )}
            {conv.messages.map((msg) => {
              const isMine = msg.senderId === callerId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-b-2xl px-4 py-2.5 text-white ${
                      isMine ? "bg-message-green rounded-tl-2xl" : "bg-message-gray rounded-tr-2xl"
                    }`}
                  >
                    <p className="wrap-break-word whitespace-pre-wrap">{msg.body}</p>
                    <p
                      className={`mt-1 text-right text-xs ${
                        isMine ? "text-popover-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMine && msg.readAt && " · Read"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Blocked / gated state */}
          {blockMessage && (
            <div className="bg-blue-dark-3 rounded-md px-4 py-3 text-center text-sm text-white">
              {blockMessage}
              {blockReason === "caller-blocked" && (
                <button
                  className="text-primary ml-2 underline"
                  onClick={() => unblockConv.mutate({ conversationId })}
                  disabled={unblockConv.isPending}
                >
                  Unblock
                </button>
              )}
            </div>
          )}

          {/* Composer */}
          {!blockMessage && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message… (⌘↵ to send)"
                maxLength={MAX_BODY}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs">
                  {body.length}/{MAX_BODY}
                </span>
                <Button
                  onClick={handleSend}
                  disabled={!body.trim() || sendMessage.isPending}
                  size="sm"
                >
                  {sendMessage.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
              {sendMessage.error && (
                <p className="text-danger text-xs">{sendMessage.error.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile job modal */}
      {conv.job && (
        <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="sr-only">{conv.job.title}</DialogTitle>
            </DialogHeader>
            <JobDetailCard job={conv.job} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
