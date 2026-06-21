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
        "from-secondary/10 via-secondary/10 to-secondary/20 rounded-md border border-white bg-linear-to-b p-5 backdrop-blur-[1px]",
        "shadow-[-5px_5px_8px_#00000033,inset_10px_-10px_8px_#ffffff66,inset_-10px_10px_8px_#ffffff]",
        className,
      )}
      {...props}
    />
  );
}
