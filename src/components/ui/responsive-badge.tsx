import { cn } from "@/lib/utils";

interface ResponsiveBadgeProps {
  isResponsive: boolean;
  isNew: boolean; // fewer than 5 scored conversations
  className?: string;
}

export function ResponsiveBadge({ isResponsive, isNew, className }: ResponsiveBadgeProps) {
  if (isNew) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
          "bg-muted text-muted-foreground border-border border",
          className,
        )}
      >
        New
      </span>
    );
  }

  if (isResponsive) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
          "bg-primary/15 text-primary border-primary/25 border",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-current" />
        Responsive
      </span>
    );
  }

  return null;
}
