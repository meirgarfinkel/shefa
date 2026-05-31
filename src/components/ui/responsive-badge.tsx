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
          "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium",
          "text-success from-primary/40 bg-white bg-linear-to-t via-transparent to-transparent shadow-lg",
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
          "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium",
          "text-success from-primary/40 bg-white bg-linear-to-t via-transparent to-transparent shadow-lg",
          className,
        )}
      >
        <span className="bg-success size-2 rounded-full" />
        Responsive
      </span>
    );
  }

  return null;
}
