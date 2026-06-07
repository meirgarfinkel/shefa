import Link from "next/link";
import { cn } from "@/lib/utils";

interface InboxRowProps {
  conversationId: string;
  name: string;
  preview: string;
  timeAgo: string;
  isUnread: boolean;
  initials: string;
  className?: string;
}

export function InboxRow({
  conversationId,
  name,
  preview,
  timeAgo,
  isUnread,
  initials,
  className,
}: InboxRowProps) {
  return (
    <Link href={`/messages/${conversationId}`}>
      <div
        className={cn(
          "mb-3 flex items-center gap-3 rounded-md p-3 transition-colors duration-100",
          "bg-card/50 hover:bg-card/10 cursor-pointer hover:shadow-sm",
          className,
        )}
      >
        {/* Unread indicator */}
        <div className="flex w-2 shrink-0 justify-center">
          {isUnread && <span className="bg-success size-2 rounded-full" />}
        </div>

        {/* Avatar */}
        <div className="bg-blue-dark-3 flex size-9 shrink-0 items-center justify-center rounded-full border border-white pl-0.5">
          <span className="text-md font-medium text-white">{initials}</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium">{name}</p>
          <p className="truncate text-sm">{preview}</p>
        </div>

        {/* Time */}
        <span className="shrink-0 text-sm">{timeAgo}</span>
      </div>
    </Link>
  );
}
