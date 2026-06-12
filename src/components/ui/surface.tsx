import { cn } from "@/lib/utils";

type SurfaceProps = React.ComponentProps<"div"> & {
  variant?: "default" | "muted";
  /** Render multi-line content: smaller text, preserve line breaks. */
  prose?: boolean;
};

/**
 * Read-only content panel — the glassmorphism surface used to display values
 * (job descriptions, profile bios, business info, etc.).
 */
export function Surface({ className, variant = "default", prose, ...props }: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      className={cn(
        "rounded-md px-3 py-2",
        variant === "default" && "bg-white/70",
        variant === "muted" && "bg-secondary/50",
        prose && "text-sm whitespace-pre-wrap",
        className,
      )}
      {...props}
    />
  );
}
