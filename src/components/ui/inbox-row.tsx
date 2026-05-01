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
          "flex items-center gap-3 px-4 py-3 transition-colors duration-150",
          "border-border border-b last:border-b-0",
          "hover:bg-muted/50 cursor-pointer",
          className,
        )}
      >
        {/* Unread indicator */}
        <div className="flex w-2 flex-shrink-0 justify-center">
          {isUnread && <span className="bg-primary size-2 rounded-full" />}
        </div>

        {/* Avatar */}
        <div className="bg-muted border-border flex size-9 flex-shrink-0 items-center justify-center rounded-full border">
          <span className="text-primary text-xs font-medium">{initials}</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={cn("text-foreground truncate text-sm font-medium")}>{name}</p>
          <p className="text-muted-foreground truncate text-xs">{preview}</p>
        </div>

        {/* Time */}
        <span className="text-muted-foreground flex-shrink-0 text-xs">{timeAgo}</span>
      </div>
    </Link>
  );
}
