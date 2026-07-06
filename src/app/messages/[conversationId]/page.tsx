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
import { JobDetailCard } from "./_job-detail-card";

const MAX_BODY = 5000;

function displayName(
  participant: {
    id: string;
    seekerProfile: { id: string; firstName: string; lastName: string } | null;
    businesses: { id: string; name: string }[];
  } | null,
): string {
  if (!participant) return "Unknown";
  if (participant.businesses.length > 0) return participant.businesses[0]!.name;
  if (participant.seekerProfile)
    return `${participant.seekerProfile.firstName} ${participant.seekerProfile.lastName}`;
  return "Unknown";
}

function profileHref(
  participant: {
    id: string;
    seekerProfile: { id: string } | null;
    businesses: { id: string }[];
  } | null,
): string | null {
  if (!participant) return null;
  if (participant.seekerProfile) return `/seeker/${participant.seekerProfile.id}`;
  if (participant.businesses.length > 0) return `/business/${participant.businesses[0]!.id}`;
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
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center">Keep it up.</div>;
  }

  if (error || !conv) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p>Conversation not found.</p>
        <Button className="mt-4" asChild>
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
    // Application status (REJECTED/CLOSED) does not halt messaging — the
    // conversation stays open for follow-up. See PROJECT_SPEC §3 (Messaging).
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl gap-6 px-4 py-6">
      {/* Job card — desktop only, sticky sidebar */}
      {conv.job && (
        <div className="hidden h-full w-80 shrink-0 overflow-y-auto lg:block">
          <JobDetailCard job={conv.job} />
        </div>
      )}

      {/* Conversation panel */}
      <div
        className={`flex h-full min-h-0 flex-col ${conv.job ? "min-w-0 flex-1" : "mx-auto w-full max-w-3xl"}`}
      >
        {/* Header */}
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
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
                <p className="text-xs">
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
                variant="success"
                size="sm"
                className="lg:hidden"
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

        {/* Messages — the only scrollable region */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {conv.messages.length === 0 && (
            <p className="py-8 text-center text-sm">No messages yet. Say hello!</p>
          )}
          {conv.messages.map((msg) => {
            const isMine = msg.senderId === callerId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-b-2xl border-none px-4 py-2.5 text-white shadow-[inset_1px_-1px_10px_#ffffff66,inset_-4px_4px_10px_#ffffff] ${
                    isMine ? "bg-message-green rounded-tl-2xl" : "bg-message-gray/80 rounded-tr-2xl"
                  }`}
                >
                  <p className="wrap-break-word whitespace-pre-wrap">{msg.body}</p>
                  <p className="mt-1 text-right text-xs text-white/70">
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
          <div className="bg-blue-dark-3 mt-4 shrink-0 rounded-md px-4 py-3 text-center text-sm text-white">
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
          <div className="mt-4 shrink-0 space-y-2">
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
