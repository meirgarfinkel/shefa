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

const MAX_BODY = 5000;

function displayName(
  participant: {
    id: string;
    seekerProfile: { id: string; firstName: string; lastName: string } | null;
    employerProfile: { id: string; companyName: true | string } | null;
  } | null,
): string {
  if (!participant) return "Unknown";
  if (participant.employerProfile) return participant.employerProfile.companyName as string;
  if (participant.seekerProfile)
    return `${participant.seekerProfile.firstName} ${participant.seekerProfile.lastName}`;
  return "Unknown";
}

function profileHref(
  participant: {
    id: string;
    seekerProfile: { id: string } | null;
    employerProfile: { id: string } | null;
  } | null,
): string | null {
  if (!participant) return null;
  if (participant.seekerProfile) return `/seeker/${participant.seekerProfile.id}`;
  if (participant.employerProfile) return `/employer/${participant.employerProfile.id}`;
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

  // Mark conversation read on open
  useEffect(() => {
    if (conv) {
      markRead.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id]);

  // Scroll to bottom when messages load or a new one arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  if (isLoading) {
    return <div className="text-text-muted mx-auto max-w-2xl px-4 py-16 text-center">Loading…</div>;
  }

  if (error || !conv) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-text-muted">Conversation not found.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/messages">Back to messages</Link>
        </Button>
      </div>
    );
  }

  const isBlocked = conv.aBlockedB || conv.bBlockedA;
  const callerIsA = conv.participantA.id === callerId;
  const callerBlocked = callerIsA ? conv.aBlockedB : conv.bBlockedA;

  const other = callerIsA ? conv.participantB : conv.participantA;
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
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-text-muted hover:text-text text-sm">
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
              <p className="text-text-muted text-xs">
                Re:{" "}
                <Link href={`/jobs/${conv.job.id}`} className="hover:underline">
                  {conv.job.title}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-text-muted">
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
                className="text-danger focus:text-danger"
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
              className="text-danger focus:text-danger"
            >
              Report user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="mb-4" />

      {/* Messages */}
      <div className="mb-4 min-h-[300px] space-y-3">
        {conv.messages.length === 0 && (
          <p className="text-text-muted py-8 text-center text-sm">No messages yet. Say hello!</p>
        )}
        {conv.messages.map((msg) => {
          const isMine = msg.senderId === callerId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine ? "bg-primary text-text" : "bg-surface-3 text-text"
                }`}
              >
                <p className="break-words whitespace-pre-wrap">{msg.body}</p>
                <p
                  className={`mt-1 text-right text-xs ${
                    isMine ? "text-text/70" : "text-text-muted"
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

      {/* Blocked state */}
      {isBlocked && (
        <div className="bg-surface-3 text-text-muted rounded-lg px-4 py-3 text-center text-sm">
          {callerBlocked ? "You have blocked this conversation." : "This conversation is blocked."}
        </div>
      )}

      {/* Composer */}
      {!isBlocked && (
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
            <span className="text-text-muted text-xs">
              {body.length}/{MAX_BODY}
            </span>
            <Button onClick={handleSend} disabled={!body.trim() || sendMessage.isPending} size="sm">
              {sendMessage.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
          {sendMessage.error && <p className="text-danger text-xs">{sendMessage.error.message}</p>}
        </div>
      )}
    </div>
  );
}
