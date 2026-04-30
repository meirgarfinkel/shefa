"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Separator } from "@/components/ui/separator";

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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Messages</h1>
      <p className="text-muted-foreground mb-6 text-sm">Your conversations.</p>

      <Separator className="mb-6" />

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && conversations?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No messages yet.</p>
        </div>
      )}

      {!isLoading && conversations && conversations.length > 0 && (
        <ul className="divide-y">
          {conversations.map((conv) => {
            const other = conv.participantA.id === callerId ? conv.participantB : conv.participantA;
            const unread = conv._count.messages;
            const hasUnread = unread > 0;

            return (
              <li key={conv.id}>
                <Link
                  href={`/messages/${conv.id}`}
                  className="hover:bg-muted/50 flex items-start gap-3 px-2 py-4 transition-colors"
                >
                  {/* Unread indicator */}
                  <div className="mt-1.5 flex-shrink-0">
                    {hasUnread ? (
                      <span className="block h-2.5 w-2.5 rounded-full bg-blue-500" />
                    ) : (
                      <span className="block h-2.5 w-2.5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${hasUnread ? "font-semibold" : "font-medium"}`}
                      >
                        {displayName(other)}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0 text-xs">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>

                    {conv.job && (
                      <p className="text-muted-foreground truncate text-xs">Re: {conv.job.title}</p>
                    )}

                    {conv.lastMessagePreview && (
                      <p className="text-muted-foreground mt-0.5 truncate text-sm">
                        {conv.lastMessagePreview}
                      </p>
                    )}
                  </div>

                  {hasUnread && (
                    <span className="mt-1 flex-shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-medium text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
