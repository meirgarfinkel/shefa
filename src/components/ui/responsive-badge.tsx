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
          "text-success bg-white shadow-[-2px_2px_8px_#00000033,inset_5px_-5px_8px_#DCDCDC99]",
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
          "text-success from-primary-light bg-white bg-linear-to-t via-transparent to-transparent shadow-lg",
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
