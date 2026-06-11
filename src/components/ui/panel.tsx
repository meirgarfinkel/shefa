import { cn } from "@/lib/utils";

/**
 * Static page-level glass container — the `bg-card/30` panel that wraps form
 * pages and detail views. Distinct from {@link Card} (the interactive surface
 * with hover/shadow) and `Surface` (read-only inner content).
 */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "bg-card/30 rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent p-5",
        className,
      )}
      {...props}
    />
  );
}
