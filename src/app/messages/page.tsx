"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { PageHeader } from "@/components/ui/page-header";
import { InboxRow } from "@/components/ui/inbox-row";

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const role = session?.user?.role;

  const { data: conversations, isLoading } = trpc.conversation.list.useQuery();

  return (
    <div className="p-5">
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Messages" description="Your conversations." />

        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {!isLoading && conversations?.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          </div>
        )}

        {!isLoading && conversations && conversations.length > 0 && (
          <div className="overflow-hidden rounded-md">
            {conversations.map((conv) => {
              const other = role === "SEEKER" ? conv.employer : conv.seeker;
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
    </div>
  );
}
