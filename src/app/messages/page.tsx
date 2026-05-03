"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { PageHeader } from "@/components/ui/page-header";
import { InboxRow } from "@/components/ui/inbox-row";

function displayName(
  participant: {
    id: string;
    seekerProfile: { id: string; firstName: string; lastName: string } | null;
    employerProfile: { id: string; companyName: string } | null;
  } | null,
): string {
  if (!participant) return "Unknown";
  if (participant.employerProfile) return participant.employerProfile.companyName;
  if (participant.seekerProfile)
    return `${participant.seekerProfile.firstName} ${participant.seekerProfile.lastName}`;
  return "Unknown";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const callerId = session?.user?.id;

  const { data: conversations, isLoading } = trpc.conversation.list.useQuery();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <PageHeader title="Messages" description="Your conversations." />

      {isLoading && <p className="text-text-muted text-sm">Loading…</p>}

      {!isLoading && conversations?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-muted text-sm">No messages yet.</p>
        </div>
      )}

      {!isLoading && conversations && conversations.length > 0 && (
        <div className="border-transprent bg-surface-1 overflow-hidden rounded-lg border">
          {conversations.map((conv) => {
            const other = conv.participantA.id === callerId ? conv.participantB : conv.participantA;
            const isUnread = conv._count.messages > 0;
            const name = displayName(other);
            const preview =
              [conv.job ? `Re: ${conv.job.title}` : null, conv.lastMessagePreview]
                .filter(Boolean)
                .join(" · ") || "";

            return (
              <InboxRow
                key={conv.id}
                conversationId={conv.id}
                name={name}
                preview={preview}
                timeAgo={formatTime(conv.lastMessageAt)}
                isUnread={isUnread}
                initials={getInitials(name)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
